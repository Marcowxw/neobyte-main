import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export type DeliveryMethod = 'retiro_tienda' | 'despacho';

export interface OrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerRut: string;
  customerPhone: string;
  customerAddress: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'mercado_pago' | 'webpay' | 'transferencia';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  itemCount: number;
  createdAt: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  // Diccionario para mostrar etiquetas amigables en vez de códigos técnicos.
  private readonly paymentMethodLabels = {
    mercado_pago: 'Mercado Pago',
    webpay: 'WebPay',
    transferencia: 'Transferencia Bancaria'
  };

  private readonly deliveryMethodLabels = {
    retiro_tienda: 'Retiro en tienda',
    despacho: 'Despacho a domicilio'
  };

  /**
   * Genera un PDF profesional de la orden
   * @param orderData Datos de la orden a generar
   * @param elementId ID del elemento HTML a convertir (opcional, para capturar diseño)
   */
  async generatePDF(orderData: OrderData, elementId?: string): Promise<void> {
    try {
      if (elementId) {
        // Modo 1: captura visual exacta de un bloque HTML (tipo "screenshot pro").
        await this.generatePDFFromHTML(elementId, orderData.orderId);
      } else {
        // Modo 2: PDF dibujado por código para control total del layout.
        this.generatePDFProgrammatic(orderData);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('No se pudo generar el PDF de la orden');
    }
  }

  /**
   * Genera un archivo Excel con los detalles de la orden
   */
  async generateExcel(orderData: OrderData): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();

      const formattedTotal = `$${orderData.total.toLocaleString('es-CL')}`;
      const purchasedItemsLabel = orderData.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(', ');

      // Sheet 1: Resumen de la orden
      const summaryData = [
        ['COMPROBANTE DE COMPRA'],
        [],
        ['ID de Orden:', orderData.orderId],
        ['Fecha:', new Date(orderData.createdAt).toLocaleDateString('es-CL')],
        ['Hora:', new Date(orderData.createdAt).toLocaleTimeString('es-CL')],
        [],
        ['INFORMACIÓN DEL CLIENTE'],
        ['Nombre completo:', orderData.customerName],
        ['RUT:', orderData.customerRut],
        ['Teléfono:', orderData.customerPhone],
        ['Email:', orderData.customerEmail],
        [],
        ['ENTREGA'],
        ['Método:', this.deliveryMethodLabels[orderData.deliveryMethod]],
        ...(orderData.deliveryMethod === 'despacho'
          ? [['Dirección:', orderData.customerAddress]]
          : []),
        [],
        ['DETALLES DE PAGO'],
        ['Método:', this.paymentMethodLabels[orderData.paymentMethod]],
        ['Moneda:', orderData.currency],
        ['Artículos comprados:', purchasedItemsLabel || 'Sin artículos'],
        ['Cantidad total:', orderData.itemCount.toString()],
        ['Total del pedido:', formattedTotal],
        []
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      // Ajuste de ancho por columna (wch = width in characters).
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Sheet 2: Detalles de productos
      const productsData = [
        ['DETALLE DE LA COMPRA'],
        [],
        ['Producto', 'Cantidad', 'Precio Unitario', 'Subtotal']
      ];

      let totalProducts = 0;
      orderData.items.forEach((item) => {
        const subtotal = item.price * item.quantity;
        totalProducts += subtotal;
        productsData.push([
          item.name,
          item.quantity.toString(),
          `$${item.price.toLocaleString('es-CL')}`,
          `$${subtotal.toLocaleString('es-CL')}`
        ]);
      });

      productsData.push([]);
      productsData.push(['TOTAL', '', '', formattedTotal]);
      productsData.push(['CANTIDAD TOTAL DE ARTÍCULOS', '', '', orderData.itemCount.toString()]);
      productsData.push(['NOMBRE DE ARTÍCULOS', '', '', purchasedItemsLabel || 'Sin artículos']);

      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      // Estructura ordenada y legible: "vamos por parte" (como diria Don Francisco).
      productsSheet['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 20 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos');

      // Descargar el archivo
      const fileName = `comprobante_${orderData.orderId}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new Error('No se pudo generar el archivo Excel');
    }
  }

  /**
   * Genera PDF capturando el elemento HTML
   */
  private async generatePDFFromHTML(elementId: string, orderId: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento HTML no encontrado');
    }

    const canvas = await html2canvas(element, {
      // scale alto mejora nitidez del PDF final.
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10;
    // Regla de tres para mantener proporción de la imagen dentro del PDF.
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5;

    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 10;

    while (heightLeft >= 0) {
      // Si la imagen no cabe en una página, continuamos en páginas siguientes.
      position = heightLeft - imgHeight + 5;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 10;
    }

    const fileName = `comprobante_${orderId}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }

  /**
   * Genera PDF de forma programática con formato profesional
   */
  private generatePDFProgrammatic(orderData: OrderData): void {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 15;

    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(41, 128, 185);
    pdf.text('COMPROBANTE DE COMPRA', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    pdf.setDrawColor(41, 128, 185);
    pdf.line(10, yPosition, pageWidth - 10, yPosition);

    // Información de la orden
    yPosition += 8;
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`ID de Orden: ${orderData.orderId}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Fecha: ${new Date(orderData.createdAt).toLocaleDateString('es-CL')}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Hora: ${new Date(orderData.createdAt).toLocaleTimeString('es-CL')}`, 15, yPosition);

    // Información del cliente
    yPosition += 12;
    pdf.setFontSize(12);
    pdf.setTextColor(41, 128, 185);
    pdf.text('INFORMACIÓN DEL CLIENTE', 15, yPosition);

    yPosition += 8;
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Nombre completo: ${orderData.customerName}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`RUT: ${orderData.customerRut}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Telefono: ${orderData.customerPhone}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Email: ${orderData.customerEmail}`, 15, yPosition);

    yPosition += 12;
    pdf.setFontSize(12);
    pdf.setTextColor(41, 128, 185);
    pdf.text('ENTREGA', 15, yPosition);

    yPosition += 8;
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Metodo: ${this.deliveryMethodLabels[orderData.deliveryMethod]}`, 15, yPosition);
    if (orderData.deliveryMethod === 'despacho') {
      yPosition += 6;
      pdf.text(`Direccion: ${orderData.customerAddress}`, 15, yPosition);
    }

    // Detalle de productos
    yPosition += 12;
    pdf.setFontSize(12);
    pdf.setTextColor(41, 128, 185);
    pdf.text('DETALLE DE LA COMPRA', 15, yPosition);

    yPosition += 8;

    // Encabezados de tabla
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.setFillColor(41, 128, 185);
    pdf.rect(15, yPosition - 5, pageWidth - 30, 6, 'F');
    pdf.text('Producto', 17, yPosition);
    pdf.text('Cantidad', 130, yPosition);
    pdf.text('Precio', 155, yPosition);
    pdf.text('Subtotal', 180, yPosition);

    yPosition += 8;

    // Items
    pdf.setTextColor(0, 0, 0);
    orderData.items.forEach((item) => {
      if (yPosition > pageHeight - 20) {
        // Salto automático para evitar cortar filas al final de página.
        pdf.addPage();
        yPosition = 15;
      }

      const subtotal = item.price * item.quantity;
      pdf.setFontSize(10);
      pdf.text(item.name, 17, yPosition);
      pdf.text(item.quantity.toString(), 130, yPosition);
      pdf.text(`$${item.price.toLocaleString('es-CL')}`, 155, yPosition);
      pdf.text(`$${subtotal.toLocaleString('es-CL')}`, 180, yPosition);

      yPosition += 6;
    });

    // Total
    yPosition += 4;
    pdf.setDrawColor(41, 128, 185);
    pdf.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 6;

    pdf.setFontSize(12);
    pdf.setTextColor(41, 128, 185);
    pdf.text(`Total: $${orderData.total.toLocaleString('es-CL')}`, pageWidth - 35, yPosition, {
      align: 'right'
    });

    // Información de pago
    yPosition += 15;
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Método de Pago: ${this.paymentMethodLabels[orderData.paymentMethod]}`, 15, yPosition);
    yPosition += 6;
    pdf.text(`Moneda: ${orderData.currency}`, 15, yPosition);

    // Footer
    yPosition = pageHeight - 15;
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Gracias por tu compra en Neobyte', pageWidth / 2, yPosition, {
      align: 'center'
    });

    const fileName = `comprobante_${orderData.orderId}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }

  /**
   * Imprime la orden
   */
  print(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento HTML no encontrado');
    }

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      // Abre una ventana minimal para imprimir solo el contenido relevante.
      printWindow.document.write(element.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  }
}

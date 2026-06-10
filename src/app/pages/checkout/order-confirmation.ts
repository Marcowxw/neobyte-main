import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService, type OrderData } from '../../services/report.service';

@Component({
  selector: 'app-order-confirmation',
  imports: [CommonModule],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmation {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);

  readonly orderData = signal<OrderData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly downloadingPDF = signal(false);
  readonly downloadingExcel = signal(false);

  private readonly paymentMethodLabels = {
    mercado_pago: 'Mercado Pago',
    webpay: 'WebPay',
    transferencia: 'Transferencia Bancaria'
  };

  private readonly deliveryMethodLabels = {
    retiro_tienda: 'Retiro en tienda',
    despacho: 'Despacho a domicilio'
  };

  constructor() {
    effect(() => {
      this.route.queryParams.subscribe((params) => {
        try {
          const orderDataParam = params['order'];
          if (!orderDataParam) {
            this.error.set('No se encontraron datos de la orden');
            this.loading.set(false);
            return;
          }

          const data = JSON.parse(decodeURIComponent(orderDataParam));
          this.orderData.set(data);
          this.error.set(null);
        } catch (err) {
          this.error.set('Error al procesar los datos de la orden');
          console.error('Error parsing order data:', err);
        } finally {
          this.loading.set(false);
        }
      });
    });
  }

  getPaymentMethodLabel(method: string): string {
    return this.paymentMethodLabels[method as keyof typeof this.paymentMethodLabels] || method;
  }

  getDeliveryMethodLabel(method: string): string {
    return this.deliveryMethodLabels[method as keyof typeof this.deliveryMethodLabels] || method;
  }

  async downloadPDF(): Promise<void> {
    const order = this.orderData();
    if (!order || this.downloadingPDF()) {
      return;
    }

    this.downloadingPDF.set(true);
    try {
      await this.reportService.generatePDF(order, 'order-receipt');
    } catch (err) {
      this.error.set('No se pudo descargar el PDF. Intenta nuevamente.');
      console.error('Error downloading PDF:', err);
    } finally {
      this.downloadingPDF.set(false);
    }
  }

  async downloadExcel(): Promise<void> {
    const order = this.orderData();
    if (!order || this.downloadingExcel()) {
      return;
    }

    this.downloadingExcel.set(true);
    try {
      await this.reportService.generateExcel(order);
    } catch (err) {
      this.error.set('No se pudo descargar el Excel. Intenta nuevamente.');
      console.error('Error downloading Excel:', err);
    } finally {
      this.downloadingExcel.set(false);
    }
  }

  print(): void {
    try {
      this.reportService.print('order-receipt');
    } catch (err) {
      this.error.set('No se pudo abrir la vista previa de impresión.');
      console.error('Error printing:', err);
    }
  }

  returnHome(): void {
    void this.router.navigate(['/']);
  }
}

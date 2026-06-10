# Imágenes del Catálogo

Coloca aquí las imágenes de los productos siguiendo esta estructura para máxima calidad y responsividad:

## Convención de Nombres

Para cada producto, debes crear 3 versiones de la imagen:

```
rtx-5070-ti-sm.jpg   (320px - móvil)
rtx-5070-ti.jpg      (640px - tablet)
rtx-5070-ti-lg.jpg   (1080px - desktop)
```

## Recomendaciones Técnicas

### Especificaciones de Imagen
- **Formato**: JPEG (máxima compresión) o WebP (para navegadores modernos)
- **Aspect Ratio**: 16:10 (1600x1000, 1280x800, 640x400, etc.)
- **DPI**: 72 DPI para web

### Tamaños Recomendados
| Versión | Ancho | Alto   | Caso de uso |
|---------|-------|--------|------------|
| sm      | 320px | 200px  | Móvil      |
| normal  | 640px | 400px  | Tablet     |
| lg      | 1080px| 675px  | Desktop    |

### Optimización
1. **Compresión**: Usar tools como TinyPNG, ImageOptim o ffmpeg
2. **Lazy Loading**: Las imágenes cargan solo cuando son visibles (nativo en navegadores)
3. **Srcset**: El navegador elige automáticamente la mejor resolución

### Productos en el Catálogo
- rtx-5070-ti (Tarjeta gráfica)
- ryzen-9900x (CPU)
- monitor-32-qhd (Monitor)
- kit-perifericos (Teclado + Mouse)
- hub-domotica (Hub IoT)
- laptop-creator (Laptop)
- smartphone-neo-x (Celular)
- smartphone-andes-pro (Celular 5G)
- console-ps5-slim (Consola)
- console-switch-oled (Consola portátil)
- tablet-air-11 (Tablet)
- smartwatch-pulse (Wearable)
- audio-anc-max (Audio)

## Ejemplo de Comando para Optimizar

```bash
# Con ImageMagick (converter)
convert original.jpg -quality 85 -resize 1080x675 rtx-5070-ti-lg.jpg
convert original.jpg -quality 85 -resize 640x400 rtx-5070-ti.jpg
convert original.jpg -quality 85 -resize 320x200 rtx-5070-ti-sm.jpg
```

## Ventajas de Esta Implementación

✅ **Responsivo**: Las imágenes se adaptan perfectamente a cualquier dispositivo
✅ **Sin pérdida de calidad**: Usa `object-fit: cover` sin distorsión
✅ **Lazy loading**: Optimizado automáticamente para performance
✅ **SEO friendly**: Includes proper `alt` text para accesibilidad
✅ **Escalable**: Añade nuevos productos solo actualizando el TypeScript

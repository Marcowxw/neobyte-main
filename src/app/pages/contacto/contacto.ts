import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  imports: [ReactiveFormsModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contacto {
  private readonly fb = new FormBuilder();

  // Formulario principal para solicitudes de cotizacion o contacto comercial.
  protected readonly contactForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    asunto: ['', [Validators.required, Validators.minLength(4)]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });

  // Mensaje visual de confirmacion para el usuario despues de enviar.
  protected readonly sent = signal(false);

  protected readonly canSubmit = computed(() => this.contactForm.valid);

  protected submitForm() {
    this.contactForm.markAllAsTouched();

    if (!this.contactForm.valid) {
      return;
    }

    this.sent.set(true);
    this.contactForm.reset({
      nombre: '',
      email: '',
      asunto: '',
      mensaje: '',
    });
  }
}

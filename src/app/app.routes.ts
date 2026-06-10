import { Routes } from '@angular/router';
import { Catalogo } from './pages/catalogo/catalogo';
import { CheckoutAuth } from './pages/checkout/checkout-auth';
import { Checkout } from './pages/checkout/checkout';
import { OrderConfirmation } from './pages/checkout/order-confirmation';
import { Home } from './pages/home/home';
import { Contacto } from './pages/contacto/contacto';
import { Inventario } from './pages/inventario/inventario';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
	{
		path: '',
		component: Home,
	},
	{
		path: 'catalogo',
		component: Catalogo,
	},
	{
		path: 'contacto',
		component: Contacto,
	},
	{
		path: 'checkout',
		redirectTo: 'checkout/payment',
		pathMatch: 'full',
	},
	{
		path: 'checkout/auth',
		component: CheckoutAuth,
	},
	{
		path: 'checkout/payment',
		component: Checkout,
	},
	{
		path: 'checkout/confirmation',
		component: OrderConfirmation,
	},
	{
		path: 'inventario',
		component: Inventario,
		canActivate: [adminGuard],
	},
	{
		path: '**',
		redirectTo: '',
	},
];

import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { firebaseApp } from './app/firebase.client';

registerLocaleData(localeEsCl);

void isAnalyticsSupported().then((supported) => {
  if (supported) {
    getAnalytics(firebaseApp);
  }
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

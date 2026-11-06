import { HttpErrorResponse } from '@angular/common/http';

// message du back : { error } a la main, ou la 1re violation quand c'est la validation (422)
export const messageOf = (err: HttpErrorResponse): string =>
  err.error?.error ?? err.error?.violations?.[0]?.title ?? 'Action impossible pour le moment.';

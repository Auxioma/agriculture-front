import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { LabelDraft, LabelsService } from './labels.service';

describe('LabelsService', () => {
  const api = environment.apiURL;
  let service: LabelsService;
  let http: HttpTestingController;

  const label = (id: string, code = id) => ({ id, code, name: code.toUpperCase(), description: null });
  const draft = (id: string, on: boolean, file: File | null = null): LabelDraft => ({ label: label(id), on, file });
  const proof = new File(['pdf'], 'certificat.pdf', { type: 'application/pdf' });
  const claimed = (...ids: string[]) => ids.map((labelId) => ({ labelId, code: labelId, name: labelId, verifiedAt: null, expiresAt: null, documentId: null, documentStatus: null }));
  const created = { status: 201, statusText: 'Created' };
  const noContent = { status: 204, statusText: 'No Content' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LabelsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ce que le serveur sait deja des labels declares, lu avant d'ecrire
  const alreadyClaimed = (...ids: string[]) => http.expectOne(`${api}/producer/labels`).flush(claimed(...ids));

  it('lit le profil, les labels proposes et les labels declares ensemble', () => {
    let page: unknown;
    service.getPage().subscribe((value) => (page = value));

    http.expectOne(`${api}/producer/profile`).flush({ verificationStatus: 'verified', verifiedAt: null });
    http.expectOne(`${api}/labels`).flush([label('bio')]);
    http.expectOne(`${api}/producer/labels`).flush(claimed('bio'));

    expect(page).toEqual({ profile: { verificationStatus: 'verified', verifiedAt: null }, catalog: [label('bio')], claimed: claimed('bio') });
  });

  it('declare un label sans justificatif en une seule ecriture', () => {
    service.save([draft('bio', true)]).subscribe();
    alreadyClaimed();

    const claim = http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/labels`);
    expect(claim.request.body).toEqual({ labelId: 'bio' });
    claim.flush({}, created);
  });

  it('envoie d abord le justificatif (type = code du label) puis declare le label avec lui', () => {
    service.save([draft('bio', true, proof)]).subscribe();
    alreadyClaimed();

    const upload = http.expectOne(`${api}/producer/verification-documents`);
    expect((upload.request.body as FormData).get('file')).toBe(proof);
    expect((upload.request.body as FormData).get('type')).toBe('bio');
    // * le label n'est pas declare tant que le justificatif n'est pas parti
    http.expectNone((r) => r.url === `${api}/producer/labels` && r.method === 'POST');
    upload.flush({ id: 'doc-1', status: 'pending' }, created);

    const claim = http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/labels`);
    expect(claim.request.body).toEqual({ labelId: 'bio', documentId: 'doc-1' });
    claim.flush({}, created);
  });

  it('rattache un nouveau justificatif a un label deja declare', () => {
    service.save([draft('hve', true, proof)]).subscribe();
    alreadyClaimed('hve');

    http.expectOne(`${api}/producer/verification-documents`).flush({ id: 'doc-2', status: 'pending' }, created);

    const attach = http.expectOne((r) => r.method === 'PUT' && r.url === `${api}/producer/labels/hve`);
    expect(attach.request.body).toEqual({ documentId: 'doc-2' });
    attach.flush({});
  });

  it('retire un label decoche, et seulement lui', () => {
    service.save([draft('bio', false), draft('hve', true), draft('local', false)]).subscribe();
    alreadyClaimed('bio', 'hve');

    http.expectOne((r) => r.method === 'DELETE' && r.url === `${api}/producer/labels/bio`).flush(null, noContent);
    // * hve reste declare, local ne l'a jamais ete : rien a ecrire pour eux
  });

  it('n ecrit rien quand tout est deja comme le producteur le veut', () => {
    service.save([draft('bio', true), draft('local', false)]).subscribe();

    alreadyClaimed('bio');
  });

  it('traite les labels l un apres l autre, pas tous en meme temps', () => {
    service.save([draft('bio', true, proof), draft('local', true)]).subscribe();
    alreadyClaimed();

    // * seul le justificatif du premier est parti ; le second attend que le premier soit fini
    const upload = http.expectOne(`${api}/producer/verification-documents`);
    http.expectNone((r) => r.url === `${api}/producer/labels` && r.method === 'POST');
    upload.flush({ id: 'doc-1', status: 'pending' }, created);
    http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/labels`).flush({}, created);
    const second = http.expectOne((r) => r.method === 'POST' && r.url === `${api}/producer/labels`);
    expect(second.request.body).toEqual({ labelId: 'local' });
    second.flush({}, created);
  });
});

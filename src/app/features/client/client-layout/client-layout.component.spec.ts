import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClientLayoutComponent } from './client-layout.component';

@Component({ template: '<p>page</p>' })
class PageStub {}

describe('ClientLayoutComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  async function open(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'client',
            component: ClientLayoutComponent,
            children: [
              { path: '', component: PageStub },
              { path: 'requests', component: PageStub },
              { path: 'requests/:id', component: PageStub },
              { path: 'messages', component: PageStub, children: [{ path: ':id', component: PageStub }] },
              { path: 'favorites', component: PageStub },
              { path: 'profile', component: PageStub },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    harness.fixture.detectChanges();
    return harness.fixture.nativeElement as HTMLElement;
  }

  // la barre latérale (desktop) puis la barre d'onglets (mobile) : les mêmes liens deux fois
  const links = (el: HTMLElement) => [...el.querySelectorAll('nav[aria-label="Espace client"]')][1].querySelectorAll('a');
  const active = (el: HTMLElement) =>
    [...links(el)].filter((a) => a.classList.contains('text-agri!')).map((a) => a.textContent?.trim());

  it('mène chaque entrée du menu à sa page, la messagerie comprise', async () => {
    const el = await open('/client');

    expect([...links(el)].map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Accueil', '/client'],
      ['Demandes', '/client/requests'],
      ['Messages', '/client/messages'],
      ['Favoris', '/client/favorites'],
      ['Profil', '/client/profile'],
    ]);
  });

  it("garde « Demandes » actif sur le détail d'une demande", async () => {
    expect(active(await open('/client/requests/abc'))).toEqual(['Demandes']);
  });

  it('garde « Messages » actif sur un fil de conversation', async () => {
    expect(active(await open('/client/messages/c1'))).toEqual(['Messages']);
  });

  it("n'active « Accueil » que sur l'accueil", async () => {
    expect(active(await open('/client'))).toEqual(['Accueil']);
    TestBed.resetTestingModule();
    expect(active(await open('/client/profile'))).toEqual(['Profil']);
  });
});

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  // memes categories que la navbar (CatalogFixtures.php), avec une photo par categorie pour le carroussel
  readonly categories = [
    { label: 'Fruits', image: '/images/categories/fruits.jpg' },
    { label: 'Légumes', image: '/images/categories/legumes.jpg' },
    { label: 'Produits laitiers', image: '/images/categories/produits-laitiers.jpg' },
    { label: 'Viandes & Volailles', image: '/images/categories/viandes-volailles.jpg' },
    { label: 'Miel & Produits de la ruche', image: '/images/categories/miel.jpg' },
  ];
}

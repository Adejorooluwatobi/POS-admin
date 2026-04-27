import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { Category } from '../../models/pos.models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html'
})
export class CategoriesComponent implements OnInit {
  public categories = signal<Category[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedCategory = signal<Partial<Category>>({
    name: '',
    slug: '',
    isActive: true
  });

  constructor(
    private categoryService: CategoryService,
    private authService: AuthService
  ) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
  }

  ngOnInit() {
    this.loadCategories();
  }

  async loadCategories() {
    this.isLoading.set(true);
    try {
      const data = await this.categoryService.getCategories();
      this.categories.set(data.items || data);
    } catch (error) {
      console.error('Failed to load categories', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedCategory.set({
      name: '',
      slug: '',
      isActive: true
    });
    this.isModalOpen.set(true);
  }

  updateSlug() {
    if (this.modalMode() !== 'view') {
      const name = this.selectedCategory().name || '';
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-');
      this.selectedCategory.update(c => ({ ...c, slug }));
    }
  }

  openEditModal(cat: Category) {
    this.modalMode.set('edit');
    this.selectedCategory.set({ ...cat });
    this.isModalOpen.set(true);
  }

  openViewModal(cat: Category) {
    this.modalMode.set('view');
    this.selectedCategory.set({ ...cat });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveCategory() {
    const c = this.selectedCategory();
    const user = this.authService.currentUser();
    const payload = {
      ...c,
      tenantId: user?.tenantId
    };

    try {
      if (this.modalMode() === 'create') {
        await this.categoryService.createCategory(payload);
      } else if (this.modalMode() === 'edit' && c.id) {
        await this.categoryService.updateCategory(c.id, payload);
      }
      this.closeModal();
      this.loadCategories();
    } catch (error: any) {
      console.error('Failed to save category', error);
      alert(`Error saving category: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}

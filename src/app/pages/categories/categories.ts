import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { Category } from '../../models/pos.models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgClass],
  templateUrl: './categories.html'
})
export class CategoriesComponent implements OnInit {
  public categories = signal<Category[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  public totalCount = computed(() => this.categories().length);
  public activeCount = computed(() => this.categories().filter(c => c.isActive).length);
  public inactiveCount = computed(() => this.categories().filter(c => !c.isActive).length);

  public searchQuery = signal<string>('');
  public statusFilter = signal<string>('All');

  public filteredCategories = computed(() => {
    let list = this.categories();
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    if (status === 'Active') {
      list = list.filter(c => c.isActive);
    } else if (status === 'Inactive') {
      list = list.filter(c => !c.isActive);
    }

    if (q) {
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q))
      );
    }

    return list;
  });

  constructor(
    private categoryService: CategoryService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPERVISOR');
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

  async toggleCategoryStatus(cat: Category) {
    if (!cat.id) return;
    try {
      await this.categoryService.updateCategory(cat.id, { ...cat, isActive: !cat.isActive });
      this.loadCategories();
    } catch (error) {
      console.error('Failed to toggle category status', error);
    }
  }

  async deleteCategory(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this category? Products in this category may be affected.')) return;

    try {
      await this.categoryService.deleteCategory(id);
      this.loadCategories();
    } catch (error: any) {
      console.error('Failed to delete category', error);
      alert(`Error deleting category: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}

import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './category-form.html'
})
export class CategoryFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public categoryId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public category = signal<any>({
    name: '',
    slug: '',
    isActive: true
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.categoryId.set(id);
      await this.loadCategory(id);
    }
  }

  async loadCategory(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.categoryService.getCategoryById(id);
      this.category.set({
        id: data.id,
        name: data.name,
        slug: data.slug,
        isActive: data.isActive !== undefined ? data.isActive : true
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load category.');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateSlug() {
    const name = this.category().name || '';
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
    this.category.update(c => ({ ...c, slug }));
  }

  async saveCategory() {
    const c = this.category();
    if (!c.name || !c.name.trim()) {
      this.errorMessage.set('Category Name is required.');
      return;
    }
    if (!c.slug || !c.slug.trim()) {
      this.errorMessage.set('Category Slug is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();
    const payload = {
      name: c.name.trim(),
      slug: c.slug.trim(),
      isActive: Boolean(c.isActive),
      tenantId: user?.tenantId
    };

    try {
      if (this.isEditMode()) {
        await this.categoryService.updateCategory(this.categoryId()!, { ...payload, id: this.categoryId()! });
      } else {
        await this.categoryService.createCategory(payload);
      }
      this.router.navigate(['/app/categories']);
    } catch (err: any) {
      console.error('Failed to save category', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save category.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/categories']);
  }
}

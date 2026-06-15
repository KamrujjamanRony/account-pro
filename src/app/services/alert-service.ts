import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

/**
 * Thin wrapper around SweetAlert2 so CRUD pages share one look and feel for
 * confirmations and result feedback.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  /** Ask the user to confirm a destructive action. Resolves true when confirmed. */
  async confirmDelete(name: string): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `This will delete <strong>${this.escape(name)}</strong>. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  /** Generic confirmation for non-delete actions (e.g. seeding). */
  async confirm(title: string, text: string, confirmText = 'Yes'): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  /** Non-blocking success toast in the top-right corner. */
  success(message: string): void {
    this.toast('success', message);
  }

  /** Non-blocking error toast in the top-right corner. */
  error(message: string): void {
    this.toast('error', message);
  }

  private toast(icon: 'success' | 'error', title: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: icon === 'error' ? 4000 : 2500,
      timerProgressBar: true,
    });
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

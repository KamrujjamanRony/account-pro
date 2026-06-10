import { Component } from '@angular/core';
import { Breadcrumb } from "../../utils/breadcrumb/breadcrumb";
import { Sidebar } from "../../components/shared/sidebar/sidebar";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main',
  imports: [Breadcrumb, RouterOutlet, Sidebar],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {}

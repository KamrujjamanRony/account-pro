import { Component } from '@angular/core';
import { Topbar } from "../../components/shared/topbar/topbar";
import { Sidebar } from "../../components/shared/sidebar/sidebar";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main',
  imports: [Topbar, RouterOutlet, Sidebar],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {}

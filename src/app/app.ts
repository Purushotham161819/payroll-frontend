import { Component } from '@angular/core';
import { EmployeeList } from './employees/employee-list';
@Component({ selector: 'app-root', imports: [EmployeeList], templateUrl: './app.html', styleUrl: './app.css' })
export class App {}

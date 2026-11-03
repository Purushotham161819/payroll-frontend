import base from '../../playwright.config';
export default {...base,testDir:'D:/projects/payroll-frontend/e2e',use:{...base.use,channel:'chrome'}};

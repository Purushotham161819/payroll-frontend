export function payrollMonths(now = new Date()) {
  const year = now.getFullYear();
  return Array.from({length: 12}, (_, month) => ({value: `${year}-${String(month + 1).padStart(2,'0')}`, year, month, label: new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(new Date(year,month,1))}));
}

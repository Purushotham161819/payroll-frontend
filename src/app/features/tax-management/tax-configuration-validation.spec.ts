import { configurationProblems, TaxDraft } from './tax-configuration-validation';
const valid = (): TaxDraft => ({ yearCode: 'FY 2026-27', effectiveDate: '2026-04-01', regime: 'new', standardDeduction: 75000,
  rebateLimit: 1200000, maximumRebate: 60000, cess: 4, minimumAge: 0, maximumAge: null,
  incomeRounding: 'nearest-ten-ignore-paise', liabilityRounding: 'nearest-ten-ignore-paise',
  slabs: [0,400000,800000,1200000,1600000,2000000,2400000].map((from,i,a)=>({from,to:a[i+1]??null,rate:i*5})),
  surcharge: [{threshold:5000000,rate:10},{threshold:10000000,rate:15}],
  mappings: [{componentId:'actual-fixture-id',name:'Shift Allowance',type:'taxable',legalReference:'Test-only reviewed fixture'}],
  sources:'https://www.incometaxindia.gov.in/Documents/Act/Income-tax-Act-2025.pdf', reviewNote:'Test-only configuration',employerReviewed:true });
describe('Complete Tax Configuration client validation',()=>{
  it.each(['old','new'])('accepts a complete %s regime draft with unlimited age and final slab',regime=>expect(configurationProblems({...valid(),regime})).toEqual([]));
  it.each([
    ['yearCode',''],['effectiveDate',''],['standardDeduction',null],['rebateLimit',null],['maximumRebate',null],
    ['standardDeduction',-1],['rebateLimit',-1],['maximumRebate',-1],['cess',-1],['cess',101],
    ['minimumAge',-1],['minimumAge',1.5],['maximumAge',-1],['maximumAge',121],['incomeRounding','invalid'],
    ['liabilityRounding','invalid'],['sources',''],['sources','https://example.com/unapproved'],['reviewNote','   '],['employerReviewed',false],
  ])('blocks invalid %s: %s',(field,value)=>expect(configurationProblems({...valid(),[String(field)]:value} as TaxDraft).length).toBeGreaterThan(0));
  it('blocks a reversed age range',()=>expect(configurationProblems({...valid(),minimumAge:60,maximumAge:59}).join(' ')).toContain('age range'));
  it.each([
    [], [{from:1,to:null,rate:0}], [{from:0,to:100,rate:0},{from:99,to:null,rate:5}],
    [{from:0,to:100,rate:0},{from:101,to:null,rate:5}], [{from:0,to:100,rate:0},{from:0,to:null,rate:5}],
    [{from:-1,to:null,rate:0}], [{from:0,to:null,rate:-1}], [{from:0,to:null,rate:101}],
    [{from:0,to:100,rate:0}], [{from:0,to:null,rate:0},{from:100,to:null,rate:5}],
  ].map(slabs=>[slabs]))('blocks invalid slab structure %#',(slabs)=>{ expect(configurationProblems({...valid(),slabs:slabs as TaxDraft['slabs']}).length).toBeGreaterThan(0); });
  it('accepts reordered contiguous slabs without mutating the draft',()=>{const d=valid();d.slabs.reverse();const before=JSON.stringify(d);expect(configurationProblems(d)).toEqual([]);expect(JSON.stringify(d)).toBe(before);});
  it.each([
    [{threshold:100,rate:5},{threshold:100,rate:10}], [{threshold:200,rate:5},{threshold:100,rate:10}],
    [{threshold:-1,rate:10}], [{threshold:100,rate:101}], [{threshold:100,rate:-1}], [{threshold:100,rate:20},{threshold:200,rate:10}],
  ].map(surcharge=>[surcharge]))('blocks invalid surcharge structure %#',(surcharge)=>{ expect(configurationProblems({...valid(),surcharge:surcharge as TaxDraft['surcharge']}).length).toBeGreaterThan(0); });
  it('accepts no surcharge tiers',()=>expect(configurationProblems({...valid(),surcharge:[]})).toEqual([]));
  it.each(['taxable','exempt','partial','conditional'])('accepts reviewed %s mapping metadata without approving claims',type=>{const d=valid();d.mappings[0]={...d.mappings[0],type,conditions:'Test fixture conditions',partialMode:'percentage',taxablePercentage:50};expect(configurationProblems(d)).toEqual([]);});
  it('names missing treatment and references using the actual component',()=>{const d=valid();d.mappings[0].type='';d.mappings[0].legalReference='';expect(configurationProblems(d)).toContain('Select a reviewed taxability treatment for Shift Allowance.');expect(configurationProblems(d)).toContain('Legal reference is required for Shift Allowance.');});
  it('blocks duplicate and missing component identities',()=>{const d=valid();d.mappings.push({...d.mappings[0]});expect(configurationProblems(d).join(' ')).toContain('one mapping');d.mappings=[{...d.mappings[0],componentId:''}];expect(configurationProblems(d).length).toBeGreaterThan(0);});
  it('blocks inactive mappings until explicitly resolved',()=>{const d=valid();d.mappings[0].available=false;expect(configurationProblems(d).join(' ')).toContain('inactive or no longer configured');});
});

import fs from 'fs';

const filePath = '/Users/bjmack/Downloads/Apps/Desmo/src/components/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports for Customer360View and Warranty
if (!content.includes('Customer360View')) {
  content = content.replace(
    'import RateBreakProfileManager from "./RateBreakProfileManager";',
    'import RateBreakProfileManager from "./RateBreakProfileManager";\nimport { Customer360View } from "./Customer360View";\nimport { WarrantyAdminPanel } from "./WarrantyAdminPanel";\nimport { Warranty } from "../types";'
  );
}

// 2. Add "warranties" to activeSubTab type
content = content.replace(
  /useState<"accounting" \| "customers" \| "products" \| "company" \| "shipping" \| "quotes" \| "rateBreaks">/,
  'useState<"accounting" | "customers" | "products" | "company" | "shipping" | "quotes" | "rateBreaks" | "warranties">'
);

// 3. Add "warranties" to the map array
content = content.replace(
  /\(\["accounting", "company", "shipping", "customers", "products", "quotes", "rateBreaks"\] as const\)\.map/,
  '(["accounting", "company", "shipping", "customers", "products", "quotes", "rateBreaks", "warranties"] as const).map'
);

// 4. Add labels and icons for "warranties" in the map
content = content.replace(
  /: "Rate Break Profiles";/,
  ': tab === "warranties" ? "Warranties" : "Rate Break Profiles";'
);
content = content.replace(
  /: <DollarSign className="w-4 h-4" \/>;/,
  ': tab === "warranties" ? <Shield className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;'
);

// 5. Inject Customer360View inside the customer detail pane
const customerDetailsEndRegex = /(<\/div>\s*<\/div>\s*<\/div>\s*)({\/\* Tab Content 5: Products \*\/})/m;
const customer360Inject = `
                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <Customer360View customer={selectedCustomer} />
                  </div>
$1$2`;
content = content.replace(customerDetailsEndRegex, customer360Inject);

// 6. Inject warranties tab content at the end of the file before the final </div>
const warrantiesTabInject = `
      {/* Tab Content 8: Warranties */}
      {activeSubTab === "warranties" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Warranty Claims</h2>
              <p className="text-sm text-slate-500">Manage customer warranty claims and returns.</p>
            </div>
          </div>
          
          <WarrantyAdminPanel />
        </div>
      )}
`;

const endOfFileRegex = /(    <\/div>\s*  \);\n};\n)$/;
content = content.replace(endOfFileRegex, warrantiesTabInject + '$1');

fs.writeFileSync(filePath, content, 'utf-8');
console.log("AdminDashboard updated.");

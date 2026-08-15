import React from "react";
import { X, BookOpen } from "lucide-react";

interface AdminGuideModalProps {
  onClose: () => void;
}

export const AdminGuideModal: React.FC<AdminGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Desmo Products Admin Guide</h2>
              <p className="text-sm text-slate-500 font-medium">A Simple, Step-by-Step Manual for Using Your Admin Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 text-slate-700">
          <div>
            <p className="text-base leading-relaxed">
              Welcome to your Admin Dashboard! Think of this as the control room for your entire business. Only you (and anyone you give admin access to) can see this page.
            </p>
            <p className="text-base leading-relaxed mt-2">
              To get here, just click the <strong>"GST & Admin"</strong> button at the top of your screen. Once you are in, you will see a row of buttons (tabs) near the top. Clicking these buttons will switch between different sections of your control room. Here is a simple guide on what every section does and how to use it.
            </p>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">📈</span> 1. Bookkeeping & GST
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This is your financial summary. It automatically calculates how much money you have made and how much GST you need to put aside for the tax office (BAS).</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Bookkeeping & GST</strong> tab.</li>
                <li>Choose your time frame (e.g., Last 30 Days, Last 3 Months, or the Full Financial Year).</li>
                <li>You will see a big summary of your Total Revenue, Total GST Collected, and how many orders have been paid.</li>
                <li>Need to give this to your accountant? Just click the <strong>Copy BAS Data</strong> button and paste it into an email to them!</li>
              </ol>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">🏢</span> 2. Company Details
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This is where you update your business's "business card" information that prints out on every invoice and quote.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Company Details</strong> tab.</li>
                <li>You will see boxes for your Company Name, ABN, Phone Number, and Address.</li>
                <li>You can also update your <strong>Banking Details</strong> here (BSB and Account Number) so customers know where to send their bank transfers.</li>
                <li>Simply type into the boxes to make changes, and click the <strong>Save Changes</strong> button at the bottom.</li>
              </ol>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">🚚</span> 3. Shipping & Freight
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This section lets you manage your default shipping charges.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Shipping & Freight</strong> tab.</li>
                <li>Here, you can adjust the base rate for sending packages out.</li>
                <li>If freight costs go up, you can simply change the number here, save it, and all future automated orders will use the new price.</li>
              </ol>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">👥</span> 4. Customers
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This is your address book. You can see everyone who has registered for an account, approve new dealers, and give special discounts to your favorite clients.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li><strong>To Approve a New User:</strong> Look for the "Pending" badge next to a new name. Click on them, and click the <strong>Approve Account</strong> button so they can start shopping.</li>
                <li><strong>To Give Special Prices:</strong> Click on any customer's name. Scroll down to their "Pricing Profile." If you want to sell them a specific meter for a cheaper price than everyone else gets, just type the special price in the box next to that item and save it.</li>
                <li><strong>To Help a Locked-out Customer:</strong> If a customer forgets their password, you can click on their name and click the button to send them a Password Reset link.</li>
              </ul>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">🔧</span> 5. Products
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This is your warehouse catalog. Use this to add new items you want to sell, change prices, or update how many you have in stock.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li><strong>To Change a Price or Stock:</strong> Scroll through the list to find the item. Click the small <strong>Edit</strong> button next to it. A window will pop up where you can type in the new price or the new stock amount. Click <strong>Save Product</strong>.</li>
                <li><strong>To Add a New Item:</strong> Look for the big <strong>+ Add New Product</strong> button. Fill out the form with the item's name, price, category, and upload a picture from your computer. Click save, and it will immediately appear on your website!</li>
              </ul>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">📄</span> 6. Quotes
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">When a customer has a huge order and wants you to calculate a custom shipping price before they pay, it goes here.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Quotes</strong> tab.</li>
                <li>You will see a list of requested quotes from your customers.</li>
                <li>Click on one to open it. Look at what they want to buy, and decide how much you need to charge for shipping.</li>
                <li>Type that shipping cost into the box and click <strong>Finalize Quote</strong>.</li>
                <li>The system will automatically email the customer to tell them the quote is ready. They can then log in and pay for it.</li>
              </ol>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">🛡️</span> 7. Warranties
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">If a customer has a broken item, they will submit a warranty claim which ends up here.</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Warranties</strong> tab.</li>
                <li>You will see a list of people claiming their item is broken.</li>
                <li>Click on a claim to read what went wrong.</li>
                <li>You can click buttons to <strong>Approve</strong> the claim (meaning you will replace or fix it) or <strong>Reject</strong> it. The customer will be notified automatically.</li>
              </ol>
            </section>

            <section className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <span className="text-2xl">💵</span> 8. Rate Break Profiles
              </h3>
              <p className="font-semibold text-slate-800 mb-2">What it does: <span className="font-normal text-slate-600">This is a tool to set up "Bulk Buy" discounts (e.g., Buy 10, get 5% off).</span></p>
              <h4 className="font-bold text-slate-800 mb-1">How to use it:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Rate Break Profiles</strong> tab.</li>
                <li>You can create a new "Rule" here. Give it a name like "Summer Discount".</li>
                <li>Set the rule: "If they buy more than 10 items, take $5 off".</li>
                <li>Once you create this rule, you can go into the <strong>Products</strong> tab and easily apply this "Summer Discount" to any item you want, saving you from having to type the discount out manually every single time!</li>
              </ol>
            </section>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-8">
            <p className="text-sm text-blue-800 font-semibold flex items-start gap-2">
              <span className="text-lg leading-none">💡</span>
              Tip: If you ever feel stuck or lost, don't worry! You can't break the website by just clicking the tabs and looking around. Take your time, and read the buttons carefully before you click them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

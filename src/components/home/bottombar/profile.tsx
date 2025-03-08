import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const [showPaymentPlansDialog, setShowPaymentPlansDialog] = useState(false); // State for payment plans dialog

  return (
    <div>
      {/* User Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowPaymentPlansDialog(true)}
      >
        <User className="h-5 w-5" />
      </Button>

      {/* Payment Plans Dialog */}
      <AlertDialog open={showPaymentPlansDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose a Payment Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Select the plan that best suits your needs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* $2 Plan */}
            <div className="border rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-normal text-lg">$2/month</h3>
                <ul className="mt-2 text-sm text-muted-foreground text-center">
                  <li>Basic tracking</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Manual reporting</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Limited report exports</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>No regenerating reports</li>
                </ul>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => (window.location.href = "/subscription/basic")}
              >
                Choose Plan
              </Button>
            </div>

            {/* $5 Plan */}
            <div className="border rounded-lg p-4 flex flex-col justify-between ">
              <div>
                <h3 className="font-normal text-lg">$5/month</h3>
                <ul className="mt-2 text-sm text-muted-foreground text-center">
                  <li>Advanced tracking</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Optional browser history tracking</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Extended report exports</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Limited regenerating reports</li>
                </ul>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() =>
                  (window.location.href = "/subscription/advanced")
                }
              >
                Choose Plan
              </Button>
            </div>

            {/* $10 Plan */}
            <div className="border rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-normal text-lg">$10/month</h3>
                <ul className="mt-2 text-sm text-muted-foreground text-center">
                  <li>Everything from lower tier plans</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Free access to one other app by Sehnsucht</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Optional HTTPS traffic tracking</li>
                  <div className="flex justify-center">
                    <div className="w-[90%] h-[0.5] bg-gray-300 my-2"></div>
                  </div>
                  <li>Unlimited Retries</li>
                </ul>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() =>
                  (window.location.href = "/subscription/professional")
                }
              >
                Choose Plan
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <div className="flex justify-between items-center w-full">
              <p className="text-sm text-muted-foreground">
                View other apps by{" "}
                <a
                  href="https://example.com" // Replace with the actual URL
                  target="_blank"
                  className="font-medium underline hover:text-primary duration-200 ease-in-out"
                >
                  Sehnsucht
                </a>
              </p>
              <AlertDialogCancel
                onClick={() => setShowPaymentPlansDialog(false)}
              >
                Close
              </AlertDialogCancel>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

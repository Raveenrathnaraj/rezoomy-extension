import "./App.css";
import React, { useState, useEffect } from "react";
import { Search, Zap, RefreshCw, Check, X } from "lucide-react";

interface InputField {
  id: string;
  type: string;
  name: string;
  placeholder: string;
  label: string;
  value: string;
  xpath: string;
}

const App: React.FC = () => {
  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // Predefined content for different types of fields

  useEffect(() => {
    getCurrentTab();
    scanPageForInputs();

    // Listen for tab updates
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.active) {
          getCurrentTab();
          scanPageForInputs();
        }
      });
    }
  }, []);

  const getCurrentTab = async () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        setCurrentUrl(tab.url || "");
      } catch (error) {
        console.error("Error getting current tab:", error);
        setCurrentUrl("Demo Mode - No active tab");
      }
    } else {
      setCurrentUrl("Demo Mode - Extension not loaded");
    }
  };

  const processData = async () => {
    const clone = document.documentElement.cloneNode(true);

    // Collect and remove unwanted tags
    const removed = [];
    (clone as Element).querySelectorAll("script, link, style").forEach((el) => {
      removed.push(el.outerHTML);
      el.remove();
    });

    // Log cleaned HTML
    const cleanedHtml = (clone as Element).outerHTML;
    console.log("Cleaned Html", cleanedHtml);
    const response = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "fetchData",
          payload: { domContent: cleanedHtml },
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(res);
          }
        }
      );
    });

    console.log("Response from background:", response);
    return response?.data;
  };

  const scanPageForInputs = async () => {
    setIsScanning(true);

    try {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: processData,
        });
        if (results && results[0]) {
          const fields = results[0].result as InputField[];
          setInputFields(fields);
        }
      }
    } catch (error) {
      console.error("Error scanning for inputs:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const fillInput = async (field: InputField) => {
    if (!autofillEnabled) return;

    try {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: fillInputField,
          args: [field.id, field.value],
        });
      } else {
        console.log(
          `Demo: Would fill field ${field.label} with: ${field.value}`
        );
        alert(`Demo Mode: Would fill "${field.label}" with "${field.value}"`);
      }
    } catch (error) {
      console.error("Error filling input:", error);
    }
  };

  const fillAllInputs = async () => {
    if (!autofillEnabled) return;

    for (const field of inputFields) {
      await fillInput(field);
      // Small delay between fills to avoid overwhelming the page
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Auto-Fill Assistant</h1>
          <button
            onClick={() => setAutofillEnabled(!autofillEnabled)}
            className={`p-1 rounded ${
              autofillEnabled ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {autofillEnabled ? <Check size={16} /> : <X size={16} />}
          </button>
        </div>
        <div className="text-sm opacity-90 truncate">
          {/* {currentUrl || "No active tab"} */}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b bg-white">
        <div className="flex gap-2">
          <button
            onClick={scanPageForInputs}
            disabled={isScanning}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isScanning ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}
            {isScanning ? "Scanning..." : "Scan Page"}
          </button>

          <button
            onClick={fillAllInputs}
            disabled={!autofillEnabled || inputFields.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            <Zap size={16} />
            Fill All
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="p-4 bg-gray-100 border-b">
        <div className="text-sm text-gray-600">
          Found {inputFields.length} input field
          {inputFields.length !== 1 ? "s" : ""}
        </div>
        {!autofillEnabled && (
          <div className="text-sm text-red-600 mt-1">Auto-fill is disabled</div>
        )}
      </div>

      {/* Input Fields List */}
      <div className="flex-1 overflow-y-auto">
        {inputFields.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Search size={48} className="mx-auto mb-2 opacity-30" />
            <p>No input fields found</p>
            <p className="text-sm mt-1">
              Click "Scan Page" to search for form fields
            </p>
          </div>
        ) : (
          <div className="p-2">
            {inputFields.map((field, index) => (
              <div
                key={`${field.id}-${index}`}
                className="mb-2 bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {field.label || field.name || field.id || "Unnamed Field"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {field.type} • {field.placeholder || "No placeholder"}
                    </div>
                  </div>
                  <button
                    onClick={() => fillInput(field)}
                    disabled={!autofillEnabled}
                    className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50 flex-shrink-0"
                  >
                    Fill
                  </button>
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                  <div className="font-medium mb-1">Prepared content:</div>
                  <div className="break-words">
                    {field.value.length > 100
                      ? `${field.value.substring(0, 100)}...`
                      : field.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-white text-center text-xs text-gray-500">
        Auto-Fill Extension v1.0
      </div>
    </div>
  );
};

// Function to be injected into the page to fill an input field
function fillInputField(fieldId: string, value: string): void {
  const element = document.getElementById(fieldId) as
    | HTMLInputElement
    | HTMLTextAreaElement;
  if (element) {
    element.focus();
    element.value = value;

    // Trigger input events to notify the page of the change
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    // For React and other frameworks
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

export default App;

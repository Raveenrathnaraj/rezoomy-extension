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

interface PredefinedContent {
  [key: string]: string;
}

const predefinedContent: PredefinedContent = {
  // Personal Information
  name: "John Doe",
  firstName: "John",
  lastname: "Doe",
  email: "john.doe@email.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street",
  city: "New York",
  state: "NY",
  zip: "10001",
  country: "United States",

  // Professional Information
  company: "Tech Solutions Inc.",
  title: "Software Engineer",
  website: "https://johndoe.dev",

  // Common Form Fields
  subject: "Inquiry about your services",
  message:
    "Hello, I would like to learn more about your services and how they can benefit my business. Please contact me at your earliest convenience.",
  comment: "This looks great! I'm interested in learning more.",
  feedback: "Excellent service and user experience.",

  // Default values
  default: "Auto-filled content",
};

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
          func: extractInputFields,
        });

        if (results && results[0]) {
          const fields = results[0].result as InputField[];
          const fieldsWithAnswers = fields.map((field) => ({
            ...field,
            value: generateAnswerForField(field),
          }));
          setInputFields(fieldsWithAnswers);
        }
      } else {
        // Demo mode - simulate some input fields
        const demoFields: InputField[] = [
          {
            id: "demo-name",
            type: "text",
            name: "name",
            placeholder: "Enter your name",
            label: "Full Name",
            value: "",
            xpath: "",
          },
          {
            id: "demo-email",
            type: "email",
            name: "email",
            placeholder: "Enter your email",
            label: "Email Address",
            value: "",
            xpath: "",
          },
          {
            id: "demo-message",
            type: "textarea",
            name: "message",
            placeholder: "Enter your message",
            label: "Message",
            value: "",
            xpath: "",
          },
        ].map((field) => ({
          ...field,
          value: generateAnswerForField(field),
        }));

        setInputFields(demoFields);
      }
    } catch (error) {
      console.error("Error scanning for inputs:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const generateAnswerForField = (field: InputField): string => {
    const fieldIdentifiers = [
      field.name?.toLowerCase(),
      field.id?.toLowerCase(),
      field.placeholder?.toLowerCase(),
      field.label?.toLowerCase(),
    ].filter(Boolean);

    // Check for specific field types
    for (const identifier of fieldIdentifiers) {
      if (identifier.includes("email")) return predefinedContent.email;
      if (identifier.includes("name") && !identifier.includes("company")) {
        if (identifier.includes("first")) return predefinedContent.firstName;
        if (identifier.includes("last")) return predefinedContent.lastname;
        return predefinedContent.name;
      }
      if (identifier.includes("phone")) return predefinedContent.phone;
      if (identifier.includes("address")) return predefinedContent.address;
      if (identifier.includes("city")) return predefinedContent.city;
      if (identifier.includes("state")) return predefinedContent.state;
      if (identifier.includes("zip") || identifier.includes("postal"))
        return predefinedContent.zip;
      if (identifier.includes("country")) return predefinedContent.country;
      if (identifier.includes("company")) return predefinedContent.company;
      if (identifier.includes("title") || identifier.includes("job"))
        return predefinedContent.title;
      if (identifier.includes("website") || identifier.includes("url"))
        return predefinedContent.website;
      if (identifier.includes("subject")) return predefinedContent.subject;
      if (identifier.includes("message") || identifier.includes("comment"))
        return predefinedContent.message;
      if (identifier.includes("feedback")) return predefinedContent.feedback;
    }

    // Check by input type
    if (field.type === "email") return predefinedContent.email;
    if (field.type === "tel") return predefinedContent.phone;
    if (field.type === "url") return predefinedContent.website;
    if (field.type === "textarea") return predefinedContent.message;

    return predefinedContent.default;
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

// Function to be injected into the page to extract input fields
function extractInputFields(): InputField[] {
  const inputs = document.querySelectorAll("input, textarea, select");
  const fields: InputField[] = [];

  inputs.forEach((input, index) => {
    const element = input as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;

    // Skip hidden, submit, and button inputs
    if (
      element.type === "hidden" ||
      element.type === "submit" ||
      element.type === "button"
    ) {
      return;
    }

    // Try to find associated label
    let label = "";
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        label = labelElement.textContent?.trim() || "";
      }
    }

    // If no label found, look for parent label or nearby text
    if (!label) {
      const parentLabel = element.closest("label");
      if (parentLabel) {
        label =
          parentLabel.textContent?.replace(element.value || "", "").trim() ||
          "";
      }
    }

    // Generate XPath for the element
    const getXPath = (element: Element): string => {
      if (element.id) return `//*[@id="${element.id}"]`;
      if (element === document.body) return "/html/body";

      const siblings = Array.from(element.parentNode?.children || []);
      const index = siblings.indexOf(element) + 1;
      const tagName = element.tagName.toLowerCase();

      return `${getXPath(element.parentElement!)}/${tagName}[${index}]`;
    };

    fields.push({
      id: element.id || `field-${index}`,
      type: element.type || element.tagName.toLowerCase(),
      name: element.name || "",
      placeholder:
        "placeholder" in element
          ? (element as HTMLInputElement | HTMLTextAreaElement).placeholder ||
            ""
          : "",
      label: label,
      value: "",
      xpath: getXPath(element),
    });
  });

  return fields;
}

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

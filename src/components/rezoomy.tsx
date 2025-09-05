"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scan, Zap, ZapOff, RotateCcw, Download, Loader2 } from "lucide-react";

interface InputField {
  id: string;
  type: string;
  name: string;
  placeholder: string;
  label: string;
  value: string;
  xpath: string;
}

const sampleFields: InputField[] = [
  {
    id: "1",
    type: "text",
    name: "firstName",
    placeholder: "Enter your first name",
    label: "First Name",
    value: "John",
    xpath: '//*[@id="firstName"]',
  },
  {
    id: "2",
    type: "textarea",
    name: "bio",
    placeholder: "Enter your bio",
    label: "Bio",
    value:
      "Experienced software engineer with 5+ years in full-stack development...",
    xpath: '//*[@id="bio"]',
  },
  {
    id: "3",
    type: "email",
    name: "email",
    placeholder: "Enter your email",
    label: "Email Address",
    value: "john.doe@example.com",
    xpath: '//*[@id="email"]',
  },
  {
    id: "4",
    type: "select",
    name: "country",
    placeholder: "Select country",
    label: "Country",
    value: "United States",
    xpath: '//*[@id="country"]',
  },
  {
    id: "5",
    type: "multiselect",
    name: "skills",
    placeholder: "Select skills",
    label: "Skills",
    value: "JavaScript, React, Node.js, Python",
    xpath: '//*[@id="skills"]',
  },
  {
    id: "6",
    type: "radio",
    name: "experience",
    placeholder: "Select experience level",
    label: "Experience Level",
    value: "Senior (5+ years)",
    xpath: '//*[@name="experience"]',
  },
  {
    id: "7",
    type: "checkbox",
    name: "remote",
    placeholder: "Remote work preference",
    label: "Open to Remote Work",
    value: "Yes",
    xpath: '//*[@id="remote"]',
  },
  {
    id: "8",
    type: "file",
    name: "resume",
    placeholder: "Upload resume",
    label: "Resume",
    value: "john_doe_resume.pdf",
    xpath: '//*[@id="resume"]',
  },
];

const getInputTypeInfo = (type: string) => {
  const typeMap: Record<string, { display: string; color: string }> = {
    text: { display: "Text", color: "bg-blue-100 text-blue-800" },
    textarea: { display: "Text Area", color: "bg-blue-100 text-blue-800" },
    email: { display: "Email", color: "bg-purple-100 text-purple-800" },
    tel: { display: "Phone", color: "bg-orange-100 text-orange-800" },
    password: { display: "Password", color: "bg-red-100 text-red-800" },
    number: { display: "Number", color: "bg-indigo-100 text-indigo-800" },
    date: { display: "Date", color: "bg-pink-100 text-pink-800" },
    time: { display: "Time", color: "bg-cyan-100 text-cyan-800" },
    url: { display: "URL", color: "bg-teal-100 text-teal-800" },
    select: { display: "Dropdown", color: "bg-yellow-100 text-yellow-800" },
    multiselect: {
      display: "Multi-Select",
      color: "bg-amber-100 text-amber-800",
    },
    radio: { display: "Radio", color: "bg-lime-100 text-lime-800" },
    checkbox: { display: "Checkbox", color: "bg-emerald-100 text-emerald-800" },
    file: { display: "File", color: "bg-slate-100 text-slate-800" },
    range: { display: "Range", color: "bg-violet-100 text-violet-800" },
    color: { display: "Color", color: "bg-rose-100 text-rose-800" },
  };
  return (
    typeMap[type] || { display: "Input", color: "bg-gray-100 text-gray-800" }
  );
};

export function Rezoomy() {
  const [inputFields, setInputFields] = useState<InputField[]>(sampleFields);
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isAllFilled, setIsAllFilled] = useState(false);
  const [autofillEnabled, setAutofillEnabled] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    scanPageForInputs();
    // Listen for tab updates
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.active) {
          scanPageForInputs();
        }
      });
    }
  }, []);

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
        setCurrentUrl(tab.url || "");

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: processData,
        });
        if (results && results[0]) {
          const inputFields = results[0].result as InputField[];
          setInputFields(inputFields);
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
        handleFillField(field.id);
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

  const handleFillField = (fieldId: string) => {
    setFilledFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
        console.log(`[v0] Reverting field ${fieldId}`);
      } else {
        newSet.add(fieldId);
        console.log(`[v0] Filling field ${fieldId} with suggested value`);
      }
      return newSet;
    });
  };
  const handleRevertAll = () => {
    setFilledFields(new Set());
    setIsAllFilled(false);
    console.log(`[v0] Reverting all inputFields`);
  };

  const isFieldFilled = (fieldId: string) => filledFields.has(fieldId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-blue-600 animate-pulse font-serif tracking-wide">
                Rezoomy
              </h1>
              <div className="h-0.5 bg-blue-500 animate-pulse mt-1 mx-auto w-20"></div>
            </div>
            <Badge
              variant="secondary"
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200"
            >
              {filledFields.size}/{inputFields.length} filled
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-2">
            <Button
              onClick={fillAllInputs}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              {isAllFilled ? "Unfill All" : "Fill All"}
            </Button>
            <Button
              onClick={scanPageForInputs}
              variant="outline"
              className="flex-1 bg-transparent border-blue-200 text-blue-600 hover:bg-blue-50"
              size="sm"
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Scan className="w-4 h-4 mr-2" />
              )}
              {isScanning ? "Scanning..." : "Scan Page"}
            </Button>
          </div>

          {filledFields.size > 0 && (
            <Button
              onClick={handleRevertAll}
              variant="outline"
              className="w-full bg-transparent border-blue-200 text-blue-600 hover:bg-blue-50"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert All
            </Button>
          )}
        </div>
      </div>

      {/* Input Fields List */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-3">
        {inputFields.map((field) => {
          const typeInfo = getInputTypeInfo(field.type);
          const isFilled = isFieldFilled(field.id);

          return (
            <Card
              key={field.id}
              className="p-3 bg-card border-border hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Label, Type, and Suggested Value */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-medium text-card-foreground">
                      {field.label}
                    </Label>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 ${typeInfo.color}`}
                    >
                      {typeInfo.display}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {field.value}
                  </p>
                </div>

                {/* Fill Status and Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {isFilled && (
                    <Badge
                      variant="default"
                      className="text-xs bg-blue-600 text-white"
                    >
                      Filled
                    </Badge>
                  )}
                  {field.type === "file" ? (
                    <Button
                      size="sm"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => fillInput(field)}
                      size="sm"
                      className={`${
                        isFilled
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {isFilled ? (
                        <ZapOff className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  );
}

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

"use client";

import { useEffect, useState } from "react";
import { Button, Card, Badge } from "@heroui/react";
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

export default function App() {
  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isAllFilled, setIsAllFilled] = useState(false);

  useEffect(() => {
    // Listen for tab updates
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.active) {
          // alert("API Trigger");
          // scanPageForInputs();
        }
      });
    }
  }, []);

  const processData = async () => {
    const clone = document.documentElement.cloneNode(true) as Element;

    // Collect and remove unwanted tags
    const removed = [];
    clone
      .querySelectorAll("script, link, style, iframe, symbol, path, svg")
      .forEach((el) => {
        removed.push(el.outerHTML);
        el.remove();
      });
    clone.querySelectorAll("*").forEach((el) => {
      el.removeAttribute("class");
      el.removeAttribute("style");
    });
    // Log cleaned HTML
    const cleanedHtml = clone.outerHTML;
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
          const inputFields = results[0].result as InputField[];
          setInputFields(inputFields);
        } else {
          console.log("No results from script execution");
        }
      }
    } catch (error) {
      console.error("Error scanning for inputs:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const fillInput = async (field: InputField) => {
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
    <div className="dark">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#0052D4] via-[#4364F7] to-[#6FB1FC] font-serif tracking-wide">
                Rexy
              </h1>
              <div className="h-0.5 bg-blue-500 mt-1 mx-auto w-20"></div>
            </div>
            {/* <Chip variant="solid">
              {filledFields?.size ?? 0}/{inputFields?.length ?? 0} filled
            </Chip> */}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-2">
            <Button
              onPress={fillAllInputs}
              color="primary"
              className="flex-1"
              startContent={<Zap className="w-4 h-4" />}
            >
              {isAllFilled ? "Unfill All" : "Fill All"}
            </Button>
            <Button
              onPress={scanPageForInputs}
              variant="bordered"
              color="primary"
              className="flex-1"
              isDisabled={isScanning}
              startContent={
                isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )
              }
            >
              {isScanning ? "Scanning..." : "Scan Page"}
            </Button>
          </div>

          {filledFields.size > 0 && (
            <Button
              onPress={handleRevertAll}
              variant="bordered"
              color="primary"
              className="w-full"
              size="sm"
              startContent={<RotateCcw className="w-4 h-4" />}
            >
              Revert All
            </Button>
          )}
        </div>
      </div>

      {/* Input Fields List */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-3">
        {inputFields?.length ? (
          inputFields?.map((field) => {
            const typeInfo = getInputTypeInfo(field.type);
            const isFilled = isFieldFilled(field.id);

            return (
              <Card
                key={field.id}
                className="p-3 hover:shadow-md transition-shadow"
                shadow="none"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Label, Type, and Suggested Value */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{field.label}</span>
                      <Badge variant="flat" color="primary" className="text-xs">
                        {typeInfo.display}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate text-left">
                      {field?.value?.length > 60 ? (
                        <div className="max-h-24 overflow-auto rounded bg-muted px-2 py-1 text-xs whitespace-pre-line">
                          {field?.value}
                        </div>
                      ) : (
                        field?.value
                      )}
                    </p>
                  </div>

                  {/* Fill Status and Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isFilled && (
                      <Badge
                        variant="solid"
                        color="primary"
                        className="text-xs"
                      >
                        Filled
                      </Badge>
                    )}
                    {field.type === "file" ? (
                      <Button
                        size="sm"
                        variant="bordered"
                        color="primary"
                        isIconOnly
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onPress={() => fillInput(field)}
                        size="sm"
                        color="primary"
                        variant={isFilled ? "solid" : "solid"}
                        isIconOnly
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
          })
        ) : (
          <div className="text-center text-sm text-muted-foreground mt-10">
            {isScanning
              ? "Scanning for input fields..."
              : "No input fields detected on this page. Or AI quota exceeded."}
          </div>
        )}
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

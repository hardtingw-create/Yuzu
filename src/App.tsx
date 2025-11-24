import React, { useState, useEffect } from "react";

const GOOGLE_SHEETS_WEBAPP_URL = "/.netlify/functions/sheets-proxy";

export type Orders = {
  [category: string]: {
    [size: string]: {
      [dateKey: string]: number;
    };
  };
};

const STORAGE_KEY = "yuzu-order-list-orders-v1";

const INITIAL_ORDERS: Orders = {
  tofu: {
    '9"': {},
    '8"': {},
    '7"': {},
    '6"': {}
  },
  yuzu: {
    'SS 6"': {},
    'SS sliced': {}
  }
};

export function buildDayLabels(baseDate: Date, offset: number): string[] {
  const labels: string[] = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate.getTime());
    d.setDate(baseDate.getDate() + offset + i - 2);
    labels.push(
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      })
    );
  }

  return labels;
}

export function buildDayKeys(baseDate: Date, offset: number): string[] {
  const keys: string[] = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate.getTime());
    d.setDate(baseDate.getDate() + offset + i - 2);
    keys.push(d.toISOString().slice(0, 10));
  }

  return keys;
}

export function _testBuildDayHelpers() {
  const base = new Date("2025-01-15T00:00:00Z");

  const labels0 = buildDayLabels(base, 0);
  const keys0 = buildDayKeys(base, 0);

  console.assert(labels0.length === 5, "labels length should be 5");
  console.assert(keys0.length === 5, "keys length should be 5");
  console.assert(
    labels0.length === keys0.length,
    "labels and keys should stay in sync"
  );

  const labelsOffset2 = buildDayLabels(base, 2);
  const keysOffset2 = buildDayKeys(base, 2);
  console.assert(labelsOffset2.length === 5, "offset labels length should be 5");
  console.assert(keysOffset2.length === 5, "offset keys length should be 5");
}

export default function OrderListApp() {
  const [today] = useState(() => new Date());
  const [offset, setOffset] = useState(0);

  const days = buildDayLabels(today, offset);
  const dayKeys = buildDayKeys(today, offset);

  const [orders, setOrders] = useState<Orders>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed as Orders;
        }
      } catch (e) {
        console.error("Failed to load saved orders from localStorage", e);
      }
    }
    return INITIAL_ORDERS;
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      }
    } catch (e) {
      console.error("Failed to persist orders to localStorage", e);
    }
  }, [orders]);

  const updateOrder = (
    category: string,
    size: string,
    dateKey: string,
    value: number
  ) => {
    setOrders(prev => {
      const prevCategory = prev[category] || {};
      const prevSize = prevCategory[size] || {};
      return {
        ...prev,
        [category]: {
          ...prevCategory,
          [size]: {
            ...prevSize,
            [dateKey]: value
          }
        }
      };
    });
  };

  const shiftDays = (dir: number) => {
    setOffset(prev => prev + dir);
  };

  const buildTableData = () => {
    const header = ["Item", ...dayKeys];
    const rows: { item: string; values: (number | string)[] }[] = [];

    Object.entries(orders).forEach(([category, items]) => {
      Object.entries(items).forEach(([size, dateMap]) => {
        const values = dayKeys.map(dateKey => (dateMap as any)[dateKey] ?? 0);
        rows.push({
          item: `${category} ${size}`,
          values
        });
      });
    });

    return { header, rows };
  };

  const loadFromGoogleSheets = async () => {
    try {
      const res = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: "GET"
      });
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }

      const data: {
        header: string[];
        rows: { item: string; values: (number | string)[] }[];
      } = await res.json();

      if (!data.header || data.header.length < 2) return;
      if (!data.rows || data.rows.length === 0) return;

      const [, ...dateKeysFromSheet] = data.header;
      const newOrders: Orders = {};

      data.rows.forEach(row => {
        const { item, values } = row;
        if (!item) return;

        const parts = item.split(" ");
        const category = parts[0];
        const size = parts.slice(1).join(" ");

        if (!category || !size) return;

        if (!newOrders[category]) newOrders[category] = {};
        if (!newOrders[category][size]) newOrders[category][size] = {};

        dateKeysFromSheet.forEach((dateKey, idx) => {
          const vRaw = values[idx];
          const vNum =
            typeof vRaw === "number"
              ? vRaw
              : Number(vRaw === "" || vRaw == null ? 0 : vRaw);
          if (!isNaN(vNum) && vNum !== 0) {
            newOrders[category][size][dateKey] = vNum;
          }
        });
      });

      setOrders(newOrders);
    } catch (err) {
      console.error("Failed to load from Google Sheets", err);
    }
  };

  useEffect(() => {
    loadFromGoogleSheets();
  }, []);

  const saveToGoogleSheets = async () => {
    const { header, rows } = buildTableData();

    try {
      const res = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ header, rows })
      });

      if (!res.ok) {
        throw new Error("Network response was not ok");
      }

      alert("Saved to Google Sheets.");
    } catch (err) {
      console.error(err);
      alert(
        "Failed to save to Google Sheets.\n" +
          "• Check that the proxy function is deployed.\n" +
          "• Check the Apps Script URL in netlify/functions/sheets-proxy.js."
      );
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-center mb-1 md:mb-2">
        <h1 className="text-xl md:text-2xl font-bold text-center">Order List</h1>
      </div>

      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        <button
          className="px-3 py-1.5 text-sm md:text-base bg-blue-500 text-white rounded-2xl shadow-sm active:scale-95"
          onClick={saveToGoogleSheets}
        >
          Save
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <div className="min-w-[640px] p-3 md:p-4 space-y-3 md:space-y-4">
          <div className="grid grid-cols-7 gap-2 md:gap-3 text-xs md:text-sm font-semibold text-center items-center">
            <button
              className="px-2 py-1 bg-gray-200 rounded-xl text-sm"
              onClick={() => shiftDays(-1)}
            >
              ◀
            </button>

            {days.map((d, idx) => (
              <span
                key={idx}
                className={"truncate " + (idx === 2 ? "font-bold underline" : "")}
              >
                {d}
              </span>
            ))}

            <button
              className="px-2 py-1 bg-gray-200 rounded-xl text-sm"
              onClick={() => shiftDays(1)}
            >
              ▶
            </button>
          </div>

          {Object.entries(orders).map(([category, items]) => (
            <div
              key={category}
              className="border rounded-2xl p-3 md:p-4 shadow-sm"
            >
              <h2 className="text-base md:text-xl font-semibold mb-2 md:mb-3 capitalize">
                {category}
              </h2>

              {Object.entries(items).map(([size, dateMap]) => (
                <div
                  key={size}
                  className="grid grid-cols-6 gap-2 md:gap-3 items-center py-1.5 md:py-2 text-xs md:text-sm"
                >
                  <span className="font-medium truncate">{size}</span>
                  {dayKeys.map((dateKey, dayIndex) => {
                    const qty = (dateMap as any)[dateKey] ?? 0;
                    return (
                      <input
                        key={dayIndex}
                        type="number"
                        className="border rounded px-1.5 md:px-2 py-1 text-center text-xs md:text-sm"
                        value={qty}
                        onChange={e =>
                          updateOrder(
                            category,
                            size,
                            dateKey,
                            Number(e.target.value)
                          )
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

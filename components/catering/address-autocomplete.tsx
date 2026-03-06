"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (result: {
    address: string;
    placeId: string;
    distanceMiles: number;
  }) => void;
  onError: (message: string) => void;
}

interface Prediction {
  placeId: string;
  description: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onError,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [distanceText, setDistanceText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      );
      const data = await res.json();
      if (data.predictions?.length) {
        setPredictions(data.predictions);
        setOpen(true);
      } else {
        setPredictions([]);
        setOpen(false);
      }
    } catch {
      setPredictions([]);
      setOpen(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      setDistanceText("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
    },
    [fetchPredictions]
  );

  const handleSelect = useCallback(async (prediction: Prediction) => {
    setInputValue(prediction.description);
    setPredictions([]);
    setOpen(false);
    setLoading(true);
    setDistanceText("");

    try {
      const res = await fetch(
        `/api/places/distance?placeId=${encodeURIComponent(prediction.placeId)}`
      );
      const data = await res.json();
      if (data.error) {
        onErrorRef.current(data.error);
        return;
      }
      setDistanceText(data.distanceText);
      onChangeRef.current({
        address: prediction.description,
        placeId: prediction.placeId,
        distanceMiles: data.distanceMiles,
      });
    } catch {
      onErrorRef.current("Distance calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef}>
      <Label htmlFor="deliveryAddress">Delivery Address *</Label>
      <div className="relative">
        <input
          id="deliveryAddress"
          required
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Start typing an address..."
          autoComplete="off"
          className="flex h-10 w-full rounded-md border bg-[#2a2a2a] border-gray-600 text-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {open && predictions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-700 bg-gray-900 shadow-lg max-h-60 overflow-auto">
            {predictions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 cursor-pointer"
                >
                  {p.description}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {distanceText && !loading && (
        <p className="text-xs text-gray-400 mt-1">
          {distanceText} from our kitchen
        </p>
      )}
    </div>
  );
}

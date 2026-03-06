"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { RESTAURANT_ORIGIN } from "@/lib/catering-pricing";

interface AddressAutocompleteProps {
  value: string;
  onChange: (result: {
    address: string;
    placeId: string;
    distanceMiles: number;
  }) => void;
  onError: (message: string) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function loadGoogleMaps(): Promise<void> {
  // Already loaded
  if (typeof google !== "undefined" && google.maps?.places) {
    return Promise.resolve();
  }

  // Check if script is already being loaded
  const existing = document.querySelector(
    'script[src*="maps.googleapis.com"]'
  );
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
      // If it's already loaded by the time we attach
      if (typeof google !== "undefined" && google.maps?.places) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=__gmapsInit`;
    script.async = true;
    script.defer = true;

    (window as unknown as Record<string, () => void>).__gmapsInit = () => {
      resolve();
      delete (window as unknown as Record<string, () => void>).__gmapsInit;
    };

    script.onerror = () => reject(new Error("Failed to load Google Maps API"));
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({
  value,
  onChange,
  onError,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [distanceText, setDistanceText] = useState("");
  const [apiLoaded, setApiLoaded] = useState(false);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;

  const calculateDistance = useCallback(
    async (placeId: string, address: string) => {
      setLoading(true);
      setDistanceText("");
      try {
        const service = new google.maps.DistanceMatrixService();
        const result = await service.getDistanceMatrix({
          origins: [RESTAURANT_ORIGIN],
          destinations: [{ placeId }],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL,
        });

        const element = result.rows[0]?.elements[0];
        if (!element || element.status !== "OK") {
          onErrorRef.current("Could not calculate distance to that address.");
          setLoading(false);
          return;
        }

        const meters = element.distance.value;
        const miles = Math.round((meters / 1609.34) * 10) / 10;
        setDistanceText(element.distance.text);
        onChangeRef.current({ address, placeId, distanceMiles: miles });
      } catch {
        onErrorRef.current("Distance calculation failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        setApiLoaded(true);

        const autocomplete = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: "us" },
            fields: ["place_id", "formatted_address"],
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.place_id && place.formatted_address) {
            calculateDistance(place.place_id, place.formatted_address);
          }
        });

        autocompleteRef.current = autocomplete;
      })
      .catch((err) => {
        console.error("Google Maps failed to load:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [calculateDistance]);

  return (
    <div>
      <Label htmlFor="deliveryAddress">Delivery Address *</Label>
      <div className="relative">
        <input
          ref={inputRef}
          id="deliveryAddress"
          required
          defaultValue={value}
          placeholder={apiLoaded ? "Start typing an address..." : "Enter delivery address"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      {distanceText && !loading && (
        <p className="text-xs text-gray-400 mt-1">
          {distanceText} from our kitchen
        </p>
      )}
      {!API_KEY && (
        <p className="text-xs text-amber-400 mt-1">
          Address autocomplete unavailable. Enter your full address manually.
        </p>
      )}
    </div>
  );
}

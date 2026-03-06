"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  setOptions,
  importLibrary,
} from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
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

let optionsSet = false;

export function AddressAutocomplete({
  value,
  onChange,
  onError,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [distanceText, setDistanceText] = useState("");
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

    if (!optionsSet) {
      setOptions({ key: API_KEY, v: "weekly", libraries: ["places"] });
      optionsSet = true;
    }

    importLibrary("places")
      .then(() => {
        if (cancelled || !inputRef.current) return;

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
      .catch(() => {
        // API failed to load — fallback to manual input
      });

    return () => {
      cancelled = true;
    };
  }, [calculateDistance]);

  return (
    <div>
      <Label htmlFor="deliveryAddress">Delivery Address *</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="deliveryAddress"
          required
          defaultValue={value}
          placeholder="Start typing an address..."
          className="pr-10"
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
    </div>
  );
}

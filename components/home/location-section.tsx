import { RESTAURANT } from "@/lib/constants";
import { formatPhoneForTel } from "@/lib/utils";
import { MapPin, Phone, Clock } from "lucide-react";

export function LocationSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
            Visit Us
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map */}
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-200">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=YOUR_MAPS_API_KEY&q=${encodeURIComponent(RESTAURANT.address.full)}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Vietnoms Location"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="flex gap-4">
              <MapPin className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg">Address</h3>
                <p className="text-gray-600 mt-1">
                  {RESTAURANT.address.street}
                  <br />
                  {RESTAURANT.address.city}, {RESTAURANT.address.state}{" "}
                  {RESTAURANT.address.zip}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Phone className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg">Phone</h3>
                <a
                  href={formatPhoneForTel(RESTAURANT.phone)}
                  className="text-gray-600 mt-1 hover:text-brand-red transition-colors"
                >
                  {RESTAURANT.phone}
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg">Hours</h3>
                <ul className="mt-1 space-y-1">
                  {RESTAURANT.hours.map((h) => (
                    <li key={h.days} className="text-gray-600">
                      <span className="font-medium text-gray-800">
                        {h.days}:
                      </span>{" "}
                      {h.open} – {h.close}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

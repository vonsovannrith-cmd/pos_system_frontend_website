
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";

import { apiFetch, apiUpload } from "@/lib/api";
import { imageSrc } from "@/lib/image";

import ProductThumb from "@/components/ProductThumb";

import type { Category, Product } from "@/types";

// ---------- Image Configuration ----------

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = ["image/jpeg", "image/png"];

// ---------- Props ----------

type Props = {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (warning?: string) => void;
};

const inputClass = "mt-1 w-full rounded border p-2";

export default function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("productForm");
  const tc = useTranslations("common");

  // ---------- Form State ----------

  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    price: product ? String(product.price) : "",
    costPrice: product ? String(product.costPrice) : "0",
    lowStockThreshold: product
      ? String(product.lowStockThreshold)
      : "",
    categoryId: product?.categoryId
      ? String(product.categoryId)
      : "",
  });

  // ---------- Image States ----------

  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // ---------- UI States ----------

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // ---------- Image Preview ----------

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // ---------- Current Product Image ----------

  const currentImage = removeImage
    ? null
    : imageSrc(product?.imageUrl ?? null);

  // ---------- Handle Form Input ----------

  const set =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((previous) => ({
        ...previous,
        [key]: e.target.value,
      }));
    };

  // ---------- Handle Image Selection ----------

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;

    setError("");

    if (picked) {
      if (!ALLOWED.includes(picked.type)) {
        setError(t("imageBadType"));
        e.target.value = "";
        return;
      }

      if (picked.size > MAX_BYTES) {
        setError(t("imageTooBig"));
        e.target.value = "";
        return;
      }

      setRemoveImage(false);
    }

    setFile(picked);
  }

  // ---------- Submit Form ----------

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    // Product Request Body

    const body = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || null,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      lowStockThreshold:
        form.lowStockThreshold === ""
          ? null
          : Number(form.lowStockThreshold),
      categoryId: form.categoryId
        ? Number(form.categoryId)
        : null,
    };

    try {
      // 1. Save Product First

      const saved = await apiFetch<Product>(
        product
          ? `/api/products/${product.id}`
          : "/api/products",
        {
          method: product ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      // 2. Handle Product Image

      try {
        if (file) {
          const fd = new FormData();

          fd.append("file", file);

          await apiUpload<Product>(
            `/api/products/${saved.id}/image`,
            fd
          );
        } else if (removeImage && product?.imageUrl) {
          await apiFetch<Product>(
            `/api/products/${saved.id}/image`,
            {
              method: "DELETE",
            }
          );
        }
      } catch (imgErr) {
        // Product was saved successfully,
        // but image operation failed.

        const reason =
          imgErr instanceof Error
            ? imgErr.message
            : t("genericError");

        onSaved(
          t("imageUploadFailed", {
            reason,
          })
        );

        return;
      }

      // 3. Notify Parent Component

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("genericError")
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI ----------

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 p-4">

      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-lg"
      >

        {/* Form Title */}

        <h2 className="text-xl font-bold">
          {product ? t("titleEdit") : t("titleNew")}
        </h2>

        {/* Error Message */}

        {error && (
          <div className="rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Product Name */}

        <label className="block text-sm">

          {t("name")}

          <input
            type="text"
            className={inputClass}
            value={form.name}
            onChange={set("name")}
            required
          />

        </label>

        {/* SKU and Barcode */}

        <div className="grid grid-cols-2 gap-3">

          <label className="block text-sm">

            {t("sku")}

            <input
              type="text"
              className={inputClass}
              value={form.sku}
              onChange={set("sku")}
              required
            />

          </label>

          <label className="block text-sm">

            {t("barcode")}

            <input
              type="text"
              className={inputClass}
              value={form.barcode}
              onChange={set("barcode")}
            />

          </label>

        </div>

        {/* Price and Cost Price */}

        <div className="grid grid-cols-2 gap-3">

          <label className="block text-sm">

            {t("price")}

            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.price}
              onChange={set("price")}
              required
            />

          </label>

          <label className="block text-sm">

            {t("costPrice")}

            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.costPrice}
              onChange={set("costPrice")}
            />

          </label>

        </div>

        {/* Low Stock and Category */}

        <div className="grid grid-cols-2 gap-3">

          <label className="block text-sm">

            {t("lowStock")}

            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder={t("lowStockPlaceholder")}
              value={form.lowStockThreshold}
              onChange={set("lowStockThreshold")}
            />

          </label>

          <label className="block text-sm">

            {t("category")}

            <select
              className={inputClass}
              value={form.categoryId}
              onChange={set("categoryId")}
            >

              <option value="">
                {t("noCategory")}
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}

            </select>

          </label>

        </div>

        {/* Product Image */}

        <div className="rounded border p-3">

          <div className="mb-2 text-sm font-medium">
            {t("image")}
          </div>

          <div className="flex items-center gap-3">

            {/* Image Preview */}

            <ProductThumb
              src={preview ?? currentImage}
              alt={form.name || t("image")}
              className="h-20 w-20 shrink-0 rounded"
            />

            <div className="min-w-0 flex-1 text-xs text-gray-500">

              {/* File Input */}

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={onPick}
                className="w-full text-sm"
              />

              <p className="mt-1">
                {t("imageHint")}
              </p>

              {/* Remove Existing Image */}

              {product?.imageUrl && !file && (
                <label className="mt-1 flex items-center gap-1 text-red-600">

                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(e) =>
                      setRemoveImage(e.target.checked)
                    }
                  />

                  {t("removeImage")}

                </label>
              )}

            </div>

          </div>

        </div>

        {/* Form Buttons */}

        <div className="flex justify-end gap-2 pt-2">

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            {tc("cancel")}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? tc("saving") : tc("save")}
          </button>

        </div>

      </form>

    </div>
  );
}

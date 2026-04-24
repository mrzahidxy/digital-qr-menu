'use client'

import { useId, useRef, useState, type ChangeEvent } from 'react'
import { ImageOff, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadFile } from '@/lib/api/upload-client'
import { cn } from '@/lib/utils'

type UploadImageProps = {
  id?: string
  label: string
  value?: string | null
  placeholder?: string
  previewAlt?: string
  previewVariant?: 'square' | 'circle' | 'wide'
  onChange: (url: string) => void
  disabled?: boolean
}

const previewClassNames: Record<
  NonNullable<UploadImageProps['previewVariant']>,
  string
> = {
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  wide: 'aspect-[16/7]',
}

export function UploadImage({
  id,
  label,
  value,
  placeholder = 'https://example.com/image.jpg',
  previewAlt = 'Uploaded image preview',
  previewVariant = 'square',
  onChange,
  disabled = false,
}: UploadImageProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const fileInputId = `${inputId}-file`
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const imageUrl = value ?? ''

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsUploading(true)
    try {
      const uploaded = await uploadFile(file)
      onChange(uploaded.url)
      toast.success(`${label} uploaded`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to upload ${label.toLowerCase()}`,
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-slate-900" htmlFor={inputId}>
          {label}
        </label>
        {imageUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            disabled={disabled || isUploading}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
        <div
          className={cn(
            'flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400',
            previewClassNames[previewVariant],
          )}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={previewAlt} className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-6 w-6" />
          )}
        </div>

        <div className="space-y-3">
          <Input
            id={inputId}
            value={imageUrl}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled || isUploading}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload image'}
            </Button>
            <span className="text-xs text-slate-500">PNG, JPG, WebP, or GIF</span>
          </div>

          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
        </div>
      </div>
    </div>
  )
}

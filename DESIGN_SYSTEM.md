# 🎨 AI Office Assistant - Design System

## Color Palette

### Primary Colors
- **Sky Blue**: #0EA5E9 (Tailwind: sky-500)
  - Use for: Primary buttons, links, active states
  - Hover: #0284C7 (Tailwind: sky-600)
- **White**: #FFFFFF
  - Use for: Cards, form backgrounds, button text
- **Light Gray**: #F8FAFC (Tailwind: slate-50)
  - Use for: Page backgrounds

### Secondary Colors
- **Dark Gray**: #1E293B (Tailwind: slate-800)
  - Use for: Text, headings
- **Medium Gray**: #64748B (Tailwind: slate-500)
  - Use for: Secondary text, labels
- **Success**: #10B981 (Tailwind: emerald-500)
- **Error**: #EF4444 (Tailwind: red-500)

## Component Guidelines

### Buttons
- **Primary Button**: `bg-sky-500 hover:bg-sky-600 text-white rounded-md shadow-sm`
- **Secondary Button**: `bg-white hover:bg-slate-50 text-sky-500 border border-sky-500 rounded-md`
- **Disabled**: Add `opacity-50 cursor-not-allowed`

### Cards
- **Standard Card**: `bg-white rounded-lg shadow-lg p-6` or `p-8`
- Use on light gray backgrounds for contrast

### Forms
- **Input Fields**: `border-slate-300 focus:ring-sky-500 focus:border-sky-500 rounded-md`
- **Labels**: `text-slate-700 font-medium`
- **Error States**: `border-red-500 text-red-600`

### Navigation
- **Sidebar**: White or sky blue background
- **Active Items**: Sky blue highlight
- **Icons**: Sky blue color

### Layout
- **Page Background**: `bg-slate-50`
- **Content Container**: White cards with `shadow-lg`
- **Spacing**: Consistent padding (p-4, p-6, p-8)

## Consistency Rules

✓ Every button MUST be sky blue
✓ Every link MUST be sky blue
✓ Every page MUST have light gray background
✓ Every form MUST be in a white card
✓ Every active state MUST use sky blue
✓ NO other primary colors allowed

## Tailwind Configuration

Add to tailwind.config.js:
```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#0EA5E9',
        dark: '#0284C7',
        light: '#38BDF8',
      }
    }
  }
}
```
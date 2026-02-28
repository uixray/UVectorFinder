# UVectorFinder -- Figma Community Publication Materials

All texts prepared for Figma Community plugin listing.

---

## 1. Plugin Name

```
UVectorFinder
```

## 2. Tagline (max 70 characters)

```
Find duplicate vectors by geometry -- regardless of size or position
```

## 3. Description (Figma Community listing)

### English

UVectorFinder detects geometrically identical vector nodes in your Figma files. It compares actual SVG path geometry -- not names, layers, or visual appearance -- to find true duplicates regardless of position, scale, or nesting.

**How it works:**
The plugin parses vector paths, normalizes their geometry to remove position and scale differences, then generates unique fingerprints. Vectors with matching fingerprints are grouped into duplicate clusters.

**Key features:**

- Full Scan mode: find ALL duplicate groups in your file
- Selection mode: select a vector, find all copies of it
- Search within Frame, Section, Page, or entire File
- Adjustable tolerance: from exact match to fuzzy similarity
- Select All, Highlight, Zoom to any found duplicate
- Convert duplicates to Component + Instances in one click
- Cross-page search and navigation
- Persistent settings between sessions
- Works with VectorNode and BooleanOperation nodes

**Use cases:**
- Clean up redundant icons and shapes
- Audit design files for optimization
- Find scattered copies of the same asset
- Build a component library from existing duplicates

**Privacy:** No network access. All processing happens locally in your browser.

### Russian (Русский)

UVectorFinder находит геометрически идентичные векторные узлы в файлах Figma. Плагин сравнивает реальную SVG-геометрию путей -- не имена, слои или внешний вид -- чтобы найти настоящие дубликаты независимо от положения, масштаба или вложенности.

**Как это работает:**
Плагин парсит векторные пути, нормализует их геометрию для устранения различий в позиции и масштабе, затем генерирует уникальные отпечатки (fingerprints). Векторы с совпадающими отпечатками группируются в кластеры дубликатов.

**Основные возможности:**

- Полное сканирование: найти ВСЕ группы дубликатов в файле
- Режим выделения: выберите вектор, найдите все его копии
- Поиск во фрейме, секции, странице или всем файле
- Настраиваемая точность: от точного совпадения до нечёткого сходства
- Выделить все, подсветить, перейти к любому найденному дубликату
- Конвертация дубликатов в компонент + инстансы в один клик
- Межстраничный поиск и навигация
- Сохранение настроек между сессиями
- Работает с VectorNode и BooleanOperation

**Сценарии использования:**
- Очистка избыточных иконок и фигур
- Аудит дизайн-файлов для оптимизации
- Поиск разбросанных копий одного ассета
- Создание библиотеки компонентов из существующих дубликатов

**Приватность:** Нет сетевого доступа. Вся обработка происходит локально в браузере.

---

## 4. Tags (for Figma Community)

```
vectors, duplicates, cleanup, optimization, geometry, icons, components, audit, search, deduplication
```

## 5. Categories

```
Design tools, Utilities
```

## 6. Creator Info

```
Name: UIXRay
Website: https://uixray.tech
GitHub: https://github.com/uixray
```

---

## 7. Screenshots Needed

The following screenshots should be created for the Figma Community listing:

### Screenshot 1: Settings Panel
- Show the plugin open with the Settings panel visible
- Demonstrate scope, method, tolerance options
- Recommended size: 1920x1080 or 1280x720

### Screenshot 2: Search Results
- Run a search and show the results panel with multiple clusters
- Expand at least one cluster to show node list
- Show the summary line (clusters found, duplicates, time)

### Screenshot 3: Highlight in Action
- Use the Highlight feature on a cluster
- Show colored dashed rectangles overlaid on duplicate vectors on the canvas
- Capture the full canvas with highlighted nodes visible

### Screenshot 4: Selection Mode
- Select a specific vector on the canvas
- Show the plugin detecting the selection ("Search Selected" button)
- Optionally show the results of a selection-mode search

### Screenshot 5: To Component Action
- Show the confirmation modal for "Convert to Component"
- Or show the result after conversion (component + instances)

---

## 8. Cover Image

Recommended: 1920x960 banner image with:
- Plugin name "UVectorFinder" prominently displayed
- Tagline: "Find duplicate vectors by geometry"
- Visual showing duplicate detection concept (same shape at different sizes/positions connected by lines or highlighted)
- Dark or neutral background
- Figma-style aesthetic

---

## 9. Version History (for first release)

### v1.0.0 (2026-02-28)

Initial release.

- Full geometry-based duplicate detection pipeline
- Two comparison methods: vectorPaths and fillGeometry
- Four search scopes: Frame, Section, Page, File
- Two search modes: Full Scan and Selection
- Adjustable tolerance with presets (Exact, Pixel, Relaxed, Loose)
- Actions: Select All, Highlight, Zoom, To Component
- Cross-page search and navigation
- Persistent settings
- 23 unit tests for core geometry pipeline
- No network access required

---

## 10. Short Bio (for "About the Creator" section)

```
UIXRay -- UX engineer and tool maker. Building plugins and utilities for designers and developers.
```

---

## 11. Support / Contact

```
GitHub Issues: https://github.com/uixray/UVectorFinder/issues
Website: https://uixray.tech
```

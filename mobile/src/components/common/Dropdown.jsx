// SplitEase/mobile/src/components/common/Dropdown.jsx
//
// Native-style anchored dropdown menu — the trigger measures its own
// on-screen position on tap, then a transparent Modal renders the option
// list directly under (or above, if there's no room below) the trigger.
// No full-screen dim — closes on outside tap or selection, like a native
// picker menu. Used for Category / Subcategory where a chip row would
// otherwise wrap or grow unbounded with many options.

// import React, { useRef, useState } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions,
// } from 'react-native';
// import { Icons } from '../icons';
// import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

// const MENU_MAX_HEIGHT = 260;
// const ROW_HEIGHT = 44;
// const SCREEN_MARGIN = 12;

// export default function Dropdown({
//   value, options, onSelect, placeholder = 'Select…', activeColor = COLORS.primary, disabled = false,
// }) {
//   const triggerRef = useRef(null);
//   const [open, setOpen] = useState(false);
//   const [menuLayout, setMenuLayout] = useState(null); // { x, y, width, height, openUp }

//   const selected = options.find((o) => o.id === value);
//   const isDisabled = disabled || options.length === 0;

//   function openMenu() {
//     if (isDisabled) return;
//     triggerRef.current?.measureInWindow((x, y, width, height) => {
//       const screenH = Dimensions.get('window').height;
//       const desiredMenuH = Math.min(MENU_MAX_HEIGHT, options.length * ROW_HEIGHT);
//       const spaceBelow = screenH - (y + height) - SCREEN_MARGIN;
//       const spaceAbove = y - SCREEN_MARGIN;
//       const openUp = spaceBelow < desiredMenuH && spaceAbove > spaceBelow;
//       setMenuLayout({ x, y, width, height, openUp });
//       setOpen(true);
//     });
//   }

//   function handleSelect(id) {
//     onSelect(id);
//     setOpen(false);
//   }

//   return (
//     <>
//       <TouchableOpacity
//         ref={triggerRef}
//         style={[styles.trigger, isDisabled && styles.triggerDisabled]}
//         onPress={openMenu}
//         activeOpacity={0.75}
//         disabled={isDisabled}
//       >
//         <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
//           {selected ? selected.label : placeholder}
//         </Text>
//         <Icons.chevronRight
//           size={16}
//           color={COLORS.text3}
//           style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}
//         />
//       </TouchableOpacity>

//       <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
//         <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
//         {menuLayout && (
//           <View
//             style={[
//               styles.menu,
//               {
//                 left: menuLayout.x,
//                 width: menuLayout.width,
//                 maxHeight: MENU_MAX_HEIGHT,
//                 ...(menuLayout.openUp
//                   ? { bottom: Dimensions.get('window').height - menuLayout.y + 6 }
//                   : { top: menuLayout.y + menuLayout.height + 6 }),
//               },
//             ]}
//           >
//             <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={options.length > 6}>
//               {options.map((opt, i) => {
//                 const isActive = opt.id === value;
//                 return (
//                   <TouchableOpacity
//                     key={String(opt.id)}
//                     style={[
//                       styles.option,
//                       i === options.length - 1 && { borderBottomWidth: 0 },
//                       isActive && { backgroundColor: activeColor + '1a' },
//                     ]}
//                     onPress={() => handleSelect(opt.id)}
//                   >
//                     <Text
//                       style={[styles.optionText, isActive && { color: activeColor, fontWeight: FONT_WEIGHT.semibold }]}
//                       numberOfLines={1}
//                     >
//                       {opt.label}
//                     </Text>
//                     {isActive && <Icons.check size={15} color={activeColor} />}
//                   </TouchableOpacity>
//                 );
//               })}
//             </ScrollView>
//           </View>
//         )}
//       </Modal>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   trigger: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
//     borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12,
//   },
//   triggerDisabled: { opacity: 0.5 },
//   triggerText: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
//   placeholderText: { color: COLORS.text3 },
//   menu: {
//     position: 'absolute',
//     backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
//     borderWidth: 1, borderColor: COLORS.border,
//     shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
//     overflow: 'hidden',
//   },
//   option: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     paddingHorizontal: SPACING.md, paddingVertical: 12,
//     borderBottomWidth: 1, borderBottomColor: COLORS.border,
//   },
//   optionText: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
// });


import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, TextInput,
} from 'react-native';
import { Icons } from '../icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const ROW_HEIGHT = 46;
const MAX_VISIBLE_ROWS = 6;
const SCREEN_MARGIN = 16;
const SEARCH_BAR_HEIGHT = 48;
// Below this many options, a search box just adds clutter for no benefit —
// only render one once scrolling would otherwise be the only way to find
// something (e.g. a long Field of Study / Subcategory list).
const SEARCH_THRESHOLD = 8;


export default function Dropdown({
  value, options, onSelect, placeholder = 'Select…', activeColor = COLORS.primary, disabled = false,
  searchable, // optional override — omit to auto-decide from options.length
}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState(null); // { x, y, width, height, openUp }
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.id === value);
  const isDisabled = disabled || options.length === 0;
  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  function openMenu() {
    if (isDisabled) return;
    setQuery('');
    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const screenH = Dimensions.get('screen').height;
      const extra = showSearch ? SEARCH_BAR_HEIGHT : 0;
      const desiredMenuH = Math.min(ROW_HEIGHT * MAX_VISIBLE_ROWS, options.length * ROW_HEIGHT) + extra;

      const spaceBelow = screenH - (pageY + height) - SCREEN_MARGIN;
      const spaceAbove = pageY - SCREEN_MARGIN;

      const openUp = spaceBelow < desiredMenuH && spaceAbove > spaceBelow;

      setLayout({ x: pageX, y: pageY, width, height, openUp });
      setOpen(true);
    });
  }

  function handleSelect(id) {
    onSelect(id);
    setOpen(false);
  }

  const extra = showSearch ? SEARCH_BAR_HEIGHT : 0;
  const maxListHeight = layout
    ? (layout.openUp
        ? Math.min(ROW_HEIGHT * MAX_VISIBLE_ROWS, layout.y - SCREEN_MARGIN - extra)
        : Math.min(ROW_HEIGHT * MAX_VISIBLE_ROWS, Dimensions.get('screen').height - (layout.y + layout.height) - SCREEN_MARGIN - extra))
    : 0;

  return (
    <View collapsable={false}>
      <TouchableOpacity
        ref={triggerRef}
        style={[
          styles.trigger,
          open && { borderColor: activeColor },
          isDisabled && styles.triggerDisabled,
        ]}
        onPress={openMenu}
        activeOpacity={0.75}
        disabled={isDisabled}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icons.chevronRight
          size={16}
          color={open ? activeColor : COLORS.text3}
          style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}
        />
      </TouchableOpacity>

      {/* statusBarTranslucent fixes the Android coordinate offset bug */}
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
        {layout && (
          <View
            style={[
              styles.menu,
              {
                left: layout.x,
                width: layout.width,
                borderColor: activeColor,
                ...(layout.openUp
                  ? { bottom: Dimensions.get('screen').height - layout.y + 6 }
                  : { top: layout.y + layout.height + 6 }),
              },
            ]}
          >
            {showSearch && (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={COLORS.text3}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Icons.search size={16} color={COLORS.text3} />
              </View>
            )}

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={filtered.length > MAX_VISIBLE_ROWS}
              style={{ maxHeight: maxListHeight, borderRadius: showSearch ? 0 : RADIUS.lg }}
            >
              {filtered.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No matches</Text>
                </View>
              ) : (
                filtered.map((opt, i) => {
                  const isActive = opt.id === value;
                  return (
                    <TouchableOpacity
                      key={String(opt.id)}
                      style={[
                        styles.option,
                        i === filtered.length - 1 && { borderBottomWidth: 0 },
                        isActive && { backgroundColor: activeColor + '14' },
                      ]}
                      onPress={() => handleSelect(opt.id)}
                    >
                      <Text
                        style={[styles.optionText, isActive && { color: activeColor, fontWeight: FONT_WEIGHT.semibold }]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {isActive && <Icons.check size={15} color={activeColor} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
  placeholderText: { color: COLORS.text3 },
  menu: {
    position: 'absolute',
    backgroundColor: COLORS.surface2,
    borderWidth: 1, borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, height: SEARCH_BAR_HEIGHT,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  optionText: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
});
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


import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions,
} from 'react-native';
import { Icons } from '../icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const ROW_HEIGHT = 46;
const MAX_VISIBLE_ROWS = 5.5;
const SCREEN_MARGIN = 16;

export default function Dropdown({
  value, options, onSelect, placeholder = 'Select…', activeColor = COLORS.primary, disabled = false,
}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState(null); // { x, y, width, height } in window coords

  const selected = options.find((o) => o.id === value);
  const isDisabled = disabled || options.length === 0;

  function openMenu() {
    if (isDisabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
      setOpen(true);
    });
  }

  function handleSelect(id) {
    onSelect(id);
    setOpen(false);
  }

  const screenH = Dimensions.get('window').height;
  let menuTop = 0;
  let menuHeight = 0;
  if (layout) {
    menuTop = layout.y + layout.height;
    menuHeight = Math.min(ROW_HEIGHT * MAX_VISIBLE_ROWS, options.length * ROW_HEIGHT);
    if (menuTop + menuHeight > screenH - SCREEN_MARGIN) {
      menuHeight = Math.max(ROW_HEIGHT * 2, screenH - SCREEN_MARGIN - menuTop);
    }
  }

  return (
    <View collapsable={false}>
      <TouchableOpacity
        ref={triggerRef}
        style={[
          styles.trigger,
          open && { borderColor: activeColor, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
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
          color={COLORS.text3}
          style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}
        />
      </TouchableOpacity>

      {/* animationType="none" — this opens instantly, attached, like a
          native form <select>, not a floating menu that fades/slides in. */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
        {layout && (
          <View
            style={[
              styles.menu,
              { left: layout.x, width: layout.width, top: menuTop, maxHeight: menuHeight, borderColor: activeColor },
            ]}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={options.length > 5}>
              {options.map((opt, i) => {
                const isActive = opt.id === value;
                return (
                  <TouchableOpacity
                    key={String(opt.id)}
                    style={[
                      styles.option,
                      i % 2 === 1 && styles.optionAlt,
                      isActive && { backgroundColor: activeColor + '1c' },
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
              })}
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
    borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  optionAlt: { backgroundColor: COLORS.surface3 },
  optionText: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
});
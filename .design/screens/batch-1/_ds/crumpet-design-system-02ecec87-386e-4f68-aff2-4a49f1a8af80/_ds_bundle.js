/* @ds-bundle: {"format":4,"namespace":"CrumpetDesignSystem_02ecec","components":[{"name":"AppText","sourcePath":"components/core/AppText.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"ICON_MAP","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MainButton","sourcePath":"components/core/MainButton.jsx"},{"name":"EmptyState","sourcePath":"components/display/EmptyState.jsx"},{"name":"HomeBanner","sourcePath":"components/display/HomeBanner.jsx"},{"name":"PetAvatar","sourcePath":"components/display/PetAvatar.jsx"},{"name":"StatusPill","sourcePath":"components/display/StatusPill.jsx"},{"name":"Tile","sourcePath":"components/display/Tile.jsx"},{"name":"UserAvatar","sourcePath":"components/display/UserAvatar.jsx"},{"name":"OccurrenceRow","sourcePath":"components/feeding/OccurrenceRow.jsx"},{"name":"PetCard","sourcePath":"components/feeding/PetCard.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"ToggleSwitch","sourcePath":"components/forms/ToggleSwitch.jsx"},{"name":"SettingsRow","sourcePath":"components/navigation/SettingsRow.jsx"},{"name":"SheetRow","sourcePath":"components/navigation/SheetRow.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"PostCard","sourcePath":"components/posts/PostCard.jsx"}],"sourceHashes":{"components/core/AppText.jsx":"d30b0e593da3","components/core/Divider.jsx":"122f41f9dda2","components/core/Icon.jsx":"e4bd9f7c01db","components/core/IconButton.jsx":"fbfea47e57af","components/core/MainButton.jsx":"21616ef9b5ae","components/display/EmptyState.jsx":"6a833dfb0bbf","components/display/HomeBanner.jsx":"073c8a31be5a","components/display/PetAvatar.jsx":"b4eb7b4b4f24","components/display/StatusPill.jsx":"6ff01bdb297b","components/display/Tile.jsx":"6abdfa5465d3","components/display/UserAvatar.jsx":"eaedd43691c5","components/feeding/OccurrenceRow.jsx":"7f08b972ee68","components/feeding/PetCard.jsx":"d43c99863bbe","components/forms/SegmentedControl.jsx":"204d13666c74","components/forms/TextField.jsx":"7d6e0d87ff43","components/forms/ToggleSwitch.jsx":"e5d9a8516bbd","components/navigation/SettingsRow.jsx":"d1086e9f97c6","components/navigation/SheetRow.jsx":"bc1e11590a75","components/navigation/TabBar.jsx":"5c652348a3ea","components/posts/PostCard.jsx":"da62d500e8a0","ui_kits/crumpet-ios/data.jsx":"cb21c16e4c5d","ui_kits/crumpet-ios/home.jsx":"8ab592e98ed2","ui_kits/crumpet-ios/ios-frame.jsx":"24642b887be3","ui_kits/crumpet-ios/posts.jsx":"e741b023f9e7"},"inlinedExternals":[],"unexposedExports":[{"name":"toInitials","sourcePath":"components/display/UserAvatar.jsx"}]} */

(() => {

const __ds_ns = (window.CrumpetDesignSystem_02ecec = window.CrumpetDesignSystem_02ecec || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/AppText.jsx
try { (() => {
const COLORS = {
  text: 'var(--text)',
  textSecondary: 'var(--text-secondary)',
  primaryText: 'var(--primary-text)',
  onPrimary: 'var(--on-primary)',
  success: 'var(--success)',
  error: 'var(--error)',
  like: 'var(--like)'
};

/**
 * Every string in the app. `header` sets Gabarito, `body` sets Inter — the two
 * are not interchangeable and a heading never falls back to body type.
 */
function AppText({
  children,
  variant = 'body',
  size,
  align = 'left',
  color = 'text',
  fontWeight = 'regular',
  numberOfLines,
  as = 'span',
  style
}) {
  const Tag = as;
  const resolved = size ?? (variant === 'header' ? 32 : 16);
  const clamp = numberOfLines ? {
    display: '-webkit-box',
    WebkitLineClamp: numberOfLines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  } : null;
  return /*#__PURE__*/React.createElement(Tag, {
    style: {
      margin: 0,
      fontFamily: variant === 'header' ? 'var(--font-heading)' : 'var(--font-body)',
      fontSize: resolved,
      lineHeight: variant === 'header' ? 1.15 : 1.42,
      letterSpacing: variant === 'header' && resolved >= 27 ? '-0.5px' : undefined,
      fontWeight: fontWeight === 'bold' ? 700 : variant === 'header' ? 600 : 400,
      textAlign: align,
      color: COLORS[color] || color,
      textWrap: 'pretty',
      ...clamp,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { AppText });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/AppText.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
/** A hairline rule. Always `border`, never a fill token and never secondary text. */
function Divider({
  inset = 0,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "separator",
    style: {
      height: 1,
      background: 'var(--border)',
      marginLeft: inset,
      ...style
    }
  });
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
/**
 * Crumpet draws every glyph from Lucide. The app maps a short product name to a
 * Lucide component in `src/constants/icon-map.ts`; this is that map, verbatim,
 * pointing at lucide-static on unpkg instead.
 */
const ICON_MAP = {
  camera: 'camera',
  asterisk: 'asterisk',
  caretDown: 'chevron-down',
  caretUp: 'chevron-up',
  caretLeft: 'chevron-left',
  caretRight: 'chevron-right',
  dot: 'dot',
  eye: 'eye',
  eyeOff: 'eye-off',
  calendar: 'calendar',
  clock: 'clock',
  check: 'check',
  circleAlert: 'circle-alert',
  plus: 'plus',
  image: 'image',
  imagePlus: 'image-plus',
  utensils: 'utensils',
  pencil: 'pencil',
  userPlus: 'user-plus',
  pawPrint: 'paw-print',
  bell: 'bell',
  heart: 'heart',
  comment: 'message-circle',
  ellipsis: 'ellipsis',
  close: 'x',
  trash: 'trash-2',
  flip: 'flip-horizontal-2',
  share: 'share',
  help: 'circle-question-mark',
  clipboardList: 'clipboard-list',
  list: 'list',
  settings: 'settings',
  lock: 'lock',
  key: 'key',
  creditCard: 'credit-card',
  sunMoon: 'sun-moon',
  sun: 'sun',
  moon: 'moon',
  sparkles: 'sparkles',
  house: 'house',
  users: 'users',
  user: 'user',
  globe: 'globe',
  hourglass: 'hourglass',
  mail: 'mail',
  lightbulb: 'lightbulb',
  star: 'star',
  info: 'info',
  shield: 'shield',
  fileText: 'file-text',
  logOut: 'log-out'
};
const CDN = 'https://unpkg.com/lucide-static@0.446.0/icons/';
const cache = {};
function Icon({
  name,
  size = 16,
  color = 'var(--text)',
  fill,
  strokeWidth = 2,
  style
}) {
  const file = ICON_MAP[name] || name;
  const [markup, setMarkup] = React.useState(cache[file] || null);
  React.useEffect(() => {
    if (cache[file]) {
      setMarkup(cache[file]);
      return;
    }
    let alive = true;
    fetch(CDN + file + '.svg').then(response => response.ok ? response.text() : Promise.reject(new Error(file))).then(text => {
      cache[file] = text;
      if (alive) setMarkup(text);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [file]);
  const svg = markup ? markup.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`).replace(/fill="none"/, `fill="${fill || 'none'}"`).replace(/stroke-width="2"/, `stroke-width="${strokeWidth}"`) : '';
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flex: '0 0 auto',
      color,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: svg
    }
  });
}
Object.assign(__ds_scope, { ICON_MAP, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const FILLS = {
  primary: {
    background: 'var(--primary)'
  },
  secondary: {
    background: 'var(--background-selected)'
  },
  ghost: {
    background: 'transparent'
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.6)'
  }
};

/** A round 44px tap target holding one glyph. */
function IconButton({
  name,
  accessibilityLabel,
  variant = 'primary',
  color,
  size = 24,
  strokeWidth,
  isDisabled = false,
  onClick,
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  const glyph = color || (variant === 'primary' ? 'var(--on-primary)' : 'var(--text)');
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": accessibilityLabel,
    disabled: isDisabled,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onClick: isDisabled ? undefined : onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
      border: 0,
      padding: 0,
      borderRadius: 'var(--radius-full)',
      cursor: isDisabled ? 'default' : 'pointer',
      transition: 'opacity 100ms linear',
      opacity: (isDisabled ? 0.5 : 1) * (pressed && !isDisabled ? 0.9 : 1),
      ...FILLS[variant],
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: size,
    color: glyph,
    strokeWidth: strokeWidth
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/MainButton.jsx
try { (() => {
const SIZE_STYLES = {
  xs: {
    height: 28,
    padding: '0 12px',
    fontSize: 13
  },
  sm: {
    height: 34,
    padding: '0 14px',
    fontSize: 14
  },
  md: {
    height: 42,
    padding: '0 18px',
    fontSize: 17
  },
  lg: {
    height: 50,
    padding: '0 22px',
    fontSize: 20
  }
};
const FILLS = {
  primary: {
    background: 'var(--primary)',
    color: 'var(--on-primary)'
  },
  secondary: {
    background: 'var(--background-element)',
    color: 'var(--text)',
    boxShadow: 'inset 0 0 0 1px var(--border)'
  },
  destructive: {
    background: 'var(--error)',
    color: 'var(--on-primary)'
  },
  text: {
    background: 'transparent',
    color: 'var(--primary-text)'
  },
  destructiveText: {
    background: 'transparent',
    color: 'var(--error)'
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.55)',
    color: 'var(--text)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.6)'
  }
};

/** The primary action control. Fixed heights, fully round, gold only on `primary`. */
function MainButton({
  text,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  isDisabled = false,
  stretch = false,
  onClick,
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  const dims = SIZE_STYLES[size];
  const inactive = isDisabled || isLoading;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: inactive,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onClick: inactive ? undefined : onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      border: 0,
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      cursor: inactive ? 'default' : 'pointer',
      alignSelf: stretch ? 'stretch' : undefined,
      width: stretch ? '100%' : undefined,
      transition: 'transform 100ms linear, opacity 100ms linear',
      transform: pressed && !inactive ? 'scale(0.96)' : 'scale(1)',
      opacity: (inactive ? 0.5 : 1) * (pressed && !inactive ? 0.9 : 1),
      ...dims,
      ...FILLS[variant],
      ...style
    }
  }, isLoading ? /*#__PURE__*/React.createElement(Spinner, {
    variant: variant
  }) : leftIcon, /*#__PURE__*/React.createElement("span", null, text), !isLoading && rightIcon);
}
function Spinner({
  variant
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      opacity: variant === 'primary' || variant === 'destructive' ? 0.8 : 0.5,
      animation: 'crumpet-spin 700ms linear infinite'
    }
  });
}
Object.assign(__ds_scope, { MainButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MainButton.jsx", error: String((e && e.message) || e) }); }

// components/display/EmptyState.jsx
try { (() => {
/** The nothing-here state. No artwork yet — a glyph in a circle stands in. */
function EmptyState({
  icon,
  title,
  description,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '64px 24px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 64,
      height: 64,
      marginBottom: 8,
      borderRadius: 32,
      background: 'var(--background-element)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 28,
    color: "var(--text-secondary)"
  })), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 18,
    fontWeight: "bold",
    align: "center",
    as: "div"
  }, title), description && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: "textSecondary",
    align: "center",
    as: "div"
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'stretch',
      marginTop: 16
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/display/HomeBanner.jsx
try { (() => {
const WASHES = {
  dawn: {
    background: 'var(--banner-dawn)',
    ink: 'var(--banner-ink-warm)'
  },
  day: {
    background: 'var(--banner-day)',
    ink: 'var(--banner-ink-warm)'
  },
  dusk: {
    background: 'var(--banner-dusk)',
    ink: 'var(--banner-ink-dusk)'
  },
  night: {
    background: 'var(--banner-night)',
    ink: 'var(--banner-ink-night)'
  }
};

/**
 * The Home banner: one surface with four states. The page never changes colour
 * through the day; only this card does. It is gold job number one.
 */
function HomeBanner({
  timeOfDay = 'day',
  greeting,
  detail,
  trailing,
  style
}) {
  const wash = WASHES[timeOfDay];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '20px 24px',
      borderRadius: 'var(--radius-banner)',
      background: wash.background,
      boxShadow: 'var(--shadow-small)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    variant: "header",
    size: 27,
    as: "div",
    style: {
      color: wash.ink,
      letterSpacing: '-0.5px',
      fontWeight: 700
    }
  }, greeting), detail && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    as: "div",
    style: {
      color: wash.ink,
      opacity: 0.72
    }
  }, detail)), trailing);
}
Object.assign(__ds_scope, { HomeBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/HomeBanner.jsx", error: String((e && e.message) || e) }); }

// components/display/PetAvatar.jsx
try { (() => {
/** A pet. Its photo, or a paw print on the sunk surface. */
function PetAvatar({
  photoUrl,
  size = 40,
  style
}) {
  const base = {
    width: size,
    height: size,
    flex: '0 0 auto',
    borderRadius: 'var(--radius-full)',
    background: 'var(--background-selected)',
    objectFit: 'cover'
  };
  if (photoUrl) return /*#__PURE__*/React.createElement("img", {
    src: photoUrl,
    alt: "",
    style: {
      ...base,
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...base,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pawPrint",
    size: size * 0.45,
    color: "var(--text-secondary)"
  }));
}
Object.assign(__ds_scope, { PetAvatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PetAvatar.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusPill.jsx
try { (() => {
const TONES = {
  gold: {
    background: 'var(--primary-muted)',
    color: 'var(--primary-text)',
    border: 'none'
  },
  quiet: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--text-secondary)'
  },
  sunk: {
    background: 'var(--background-selected)',
    color: 'var(--text)',
    border: 'none'
  }
};

/** A small round label — a role, a "Soon" marker, a pet tag on a Post. */
function StatusPill({
  label,
  tone = 'gold',
  leading,
  style
}) {
  const skin = TONES[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      lineHeight: 1.5,
      background: skin.background,
      color: skin.color,
      border: skin.border,
      ...style
    }
  }, leading, label);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/display/Tile.jsx
try { (() => {
/** A square-ish navigation card: glyph in a well, label, subtitle. Half-width in the grid. */
function Tile({
  label,
  subtitle,
  icon,
  onClick,
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": subtitle ? `${label}. ${subtitle}` : label,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      flex: 1,
      minHeight: 120,
      padding: 16,
      border: 0,
      textAlign: 'left',
      borderRadius: 'var(--radius-card)',
      background: 'var(--background-element)',
      boxShadow: 'var(--shadow-medium)',
      cursor: 'pointer',
      opacity: pressed ? 0.9 : 1,
      transition: 'opacity 100ms linear',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-tile)',
      background: 'var(--background-selected)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22,
    color: "var(--text)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    variant: "header",
    size: 16
  }, label), subtitle && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary"
  }, subtitle)));
}
Object.assign(__ds_scope, { Tile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tile.jsx", error: String((e && e.message) || e) }); }

// components/display/UserAvatar.jsx
try { (() => {
const circle = size => ({
  width: size,
  height: size,
  flex: '0 0 auto',
  borderRadius: 'var(--radius-full)',
  objectFit: 'cover',
  background: 'var(--background-selected)'
});
function toInitials(firstName, lastName) {
  const initials = [firstName, lastName].map(part => part ? part.trim().charAt(0).toUpperCase() : '').join('');
  return initials || '?';
}

/** A member. Their photo if there is one, otherwise their initials — never gold. */
function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 72,
  style
}) {
  if (avatarUrl) {
    return /*#__PURE__*/React.createElement("img", {
      src: avatarUrl,
      alt: "",
      style: {
        ...circle(size),
        ...style
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...circle(size),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: size * 0.36,
      color: 'var(--text)',
      ...style
    }
  }, toInitials(firstName, lastName));
}
Object.assign(__ds_scope, { toInitials, UserAvatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/UserAvatar.jsx", error: String((e && e.message) || e) }); }

// components/feeding/OccurrenceRow.jsx
try { (() => {
/**
 * One feed time on one day. The row never shouts: nothing here is red, because
 * the app only knows whether anyone tapped Log — not whether the pet ate.
 */
function OccurrenceRow({
  label,
  time,
  detail,
  state = 'upcoming',
  isNested = false,
  isLogging = false,
  onLog,
  onOpenLog,
  style
}) {
  const isFed = state === 'fed';
  const line = detail ?? (state === 'missed' ? 'Not logged' : undefined);
  return /*#__PURE__*/React.createElement("div", {
    onClick: isFed ? onOpenLog : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: isNested ? '8px 0' : 16,
      borderRadius: isNested ? 0 : 12,
      background: isNested ? 'transparent' : 'var(--background-element)',
      cursor: isFed && onOpenLog ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 15
  }, label), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 15,
    color: "textSecondary"
  }, time)), line && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary",
    numberOfLines: 2
  }, line)), /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'center',
      display: 'flex'
    }
  }, isFed ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 20,
    color: "var(--success)"
  }) : onLog ? /*#__PURE__*/React.createElement(__ds_scope.MainButton, {
    text: "Log",
    size: "xs",
    isLoading: isLogging,
    onClick: onLog
  }) : /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary"
  }, "Upcoming")));
}
Object.assign(__ds_scope, { OccurrenceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feeding/OccurrenceRow.jsx", error: String((e && e.message) || e) }); }

// components/feeding/PetCard.jsx
try { (() => {
/** One pet's day on Home. Collapses once everything is logged. */
function PetCard({
  name,
  photoUrl,
  summary,
  isAllLogged = false,
  defaultOpen,
  children,
  onOpenPet,
  style
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? !isAllLogged);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px',
      borderRadius: 'var(--radius-card)',
      background: 'var(--background-element)',
      boxShadow: 'var(--shadow-medium)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onOpenPet,
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '4px 0',
      minWidth: 0,
      cursor: onOpenPet ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PetAvatar, {
    photoUrl: photoUrl,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 18,
    fontWeight: "bold",
    numberOfLines: 1
  }, name), summary && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary",
    numberOfLines: 1
  }, summary))), isAllLogged && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 20,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "caretDown",
    variant: "ghost",
    size: 18,
    accessibilityLabel: open ? `Hide ${name}'s feeds` : `Show ${name}'s feeds`,
    onClick: () => setOpen(!open),
    style: {
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: `transform ${open ? 220 : 160}ms ease`
    }
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Divider, null), children));
}
Object.assign(__ds_scope, { PetCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feeding/PetCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
/** iOS-style segmented control. The thumb is critically damped — it never overshoots. */
function SegmentedControl({
  label,
  options,
  value,
  onChange,
  style
}) {
  const index = Math.max(options.findIndex(option => option.value === value), 0);
  const count = options.length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    fontWeight: "bold",
    as: "div"
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      background: 'var(--background-element)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      width: `calc((100% - 8px - ${(count - 1) * 4}px) / ${count})`,
      transform: `translateX(calc(${index} * (100% + 4px)))`,
      borderRadius: 10,
      background: 'var(--background-selected)',
      transition: 'transform 400ms cubic-bezier(0.23, 1, 0.32, 1)'
    }
  }), options.map(option => {
    const selected = option.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: option.value,
      type: "button",
      "aria-pressed": selected,
      onClick: () => onChange && onChange(option.value),
      style: {
        position: 'relative',
        flex: 1,
        minHeight: 44,
        border: 0,
        padding: '0 8px',
        borderRadius: 10,
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: selected ? 700 : 400,
        color: selected ? 'var(--text)' : 'var(--text-secondary)'
      }
    }, option.label);
  })));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
/** A labelled text field. 8px corners — the one control that is not fully round. */
function TextField({
  label,
  description,
  placeholder,
  value,
  onChange,
  isMultiline = false,
  height,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  error,
  maxLength,
  showCharacterCount = false,
  isEditable = true,
  style
}) {
  const [revealed, setRevealed] = React.useState(false);
  const boxHeight = height ?? (isMultiline ? 120 : 46);
  const Field = isMultiline ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 16,
    as: "label",
    style: {
      marginBottom: description ? 0 : 4
    }
  }, label), description && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: "textSecondary",
    as: "div",
    style: {
      marginBottom: 4
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: isMultiline ? 'flex-start' : 'center',
      height: boxHeight,
      borderRadius: 8,
      border: `1px solid ${error ? 'var(--error)' : 'var(--text-secondary)'}`,
      background: 'var(--background)',
      opacity: isEditable ? 1 : 0.5
    }
  }, leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      paddingLeft: 12,
      display: 'flex'
    }
  }, leftIcon), /*#__PURE__*/React.createElement(Field, {
    value: value,
    placeholder: placeholder,
    maxLength: maxLength,
    disabled: !isEditable,
    type: secureTextEntry && !revealed ? 'password' : 'text',
    onChange: event => onChange && onChange(event.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch',
      padding: isMultiline ? '12px' : '0 12px',
      border: 0,
      outline: 'none',
      background: 'transparent',
      resize: 'none',
      color: 'var(--text)',
      fontFamily: 'var(--font-body)',
      fontSize: 14
    }
  }), rightIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      paddingRight: 12,
      display: 'flex'
    }
  }, rightIcon), secureTextEntry && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": revealed ? 'Hide the password' : 'Show the password',
    onClick: () => setRevealed(!revealed),
    style: {
      border: 0,
      background: 'transparent',
      padding: '0 12px',
      cursor: 'pointer',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: revealed ? 'eye' : 'eyeOff',
    size: 16,
    color: "var(--text)"
  }))), showCharacterCount && maxLength !== undefined && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 12,
    color: "textSecondary",
    align: "right",
    as: "div",
    style: {
      marginTop: 4
    }
  }, (value || '').length, "/", maxLength), error && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "error",
    as: "div",
    style: {
      marginTop: 8
    }
  }, error));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/forms/ToggleSwitch.jsx
try { (() => {
/** A label, a line of explanation, and an iOS switch. Gold when on. */
function ToggleSwitch({
  label,
  description,
  value,
  isDisabled = false,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    fontWeight: "bold",
    color: isDisabled ? 'textSecondary' : 'text',
    as: "div"
  }, label), description && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary",
    as: "div"
  }, description)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-label": label,
    disabled: isDisabled,
    onClick: () => onChange && onChange(!value),
    style: {
      width: 51,
      height: 31,
      flex: '0 0 auto',
      border: 0,
      padding: 2,
      borderRadius: 'var(--radius-full)',
      background: value ? 'var(--primary)' : 'rgba(58, 48, 38, 0.16)',
      opacity: isDisabled ? 0.5 : 1,
      cursor: isDisabled ? 'default' : 'pointer',
      transition: 'background 160ms linear'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 27,
      height: 27,
      borderRadius: '50%',
      background: '#FFFFFF',
      boxShadow: '0 1px 3px rgba(74, 58, 38, 0.35)',
      transform: `translateX(${value ? 20 : 0}px)`,
      transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1)'
    }
  })));
}
Object.assign(__ds_scope, { ToggleSwitch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ToggleSwitch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SettingsRow.jsx
try { (() => {
/** A row on a settings list. 44px, glyph, label, optional value, chevron. */
function SettingsRow({
  icon,
  label,
  value,
  variant = 'default',
  isSoon = false,
  isDisabled = false,
  onClick,
  style
}) {
  const destructive = variant === 'destructive';
  const pressable = Boolean(onClick) && !isSoon && !isDisabled;
  const tone = destructive ? 'error' : isSoon ? 'textSecondary' : 'text';
  return /*#__PURE__*/React.createElement("div", {
    onClick: pressable ? onClick : undefined,
    role: pressable ? 'button' : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      minHeight: 44,
      padding: '0 16px',
      opacity: isDisabled ? 0.5 : 1,
      cursor: pressable ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: destructive ? 'var(--error)' : 'var(--text-secondary)'
  }), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 16,
    color: tone,
    numberOfLines: 1,
    style: {
      flex: 1
    }
  }, label), isSoon ? /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--text-secondary)',
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, "Soon") : /*#__PURE__*/React.createElement(React.Fragment, null, value && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: "textSecondary",
    numberOfLines: 1,
    style: {
      maxWidth: '55%'
    }
  }, value), pressable && !destructive && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "caretRight",
    size: 16,
    color: "var(--text-secondary)"
  })));
}
Object.assign(__ds_scope, { SettingsRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SettingsRow.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SheetRow.jsx
try { (() => {
/** A row inside a bottom sheet. Its own fill, 24px corners, a tick when selected. */
function SheetRow({
  label,
  detail,
  icon,
  leading,
  isSelected = false,
  isDestructive = false,
  surface = 'sheet',
  onClick,
  style
}) {
  const tone = isDestructive ? 'error' : 'text';
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      borderRadius: 'var(--radius-card)',
      background: surface === 'screen' ? 'var(--background-element)' : 'var(--background-sheet-row)',
      cursor: 'pointer',
      ...style
    }
  }, leading || icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22,
    color: isDestructive ? 'var(--error)' : 'var(--text)'
  }), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 17,
    color: tone,
    style: {
      flex: 1
    }
  }, label), detail && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: "textSecondary"
  }, detail), isSelected && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 20,
    color: "var(--success)"
  }));
}
Object.assign(__ds_scope, { SheetRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SheetRow.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
/**
 * The three-tab bar: Home, Posts, Profile. The active tint is gold — job three
 * of three. On iOS this is a native tab bar; this is its visual stand-in.
 */
function TabBar({
  active = 'home',
  badges = {},
  onChange,
  style
}) {
  const tabs = [{
    id: 'home',
    label: 'Home',
    icon: 'house'
  }, {
    id: 'posts',
    label: 'Posts',
    icon: 'image'
  }, {
    id: 'profile',
    label: 'Profile',
    icon: 'user'
  }];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingTop: 8,
      paddingBottom: 28,
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid var(--border)',
      ...style
    }
  }, tabs.map(tab => {
    const on = tab.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      type: "button",
      "aria-current": on ? 'page' : undefined,
      onClick: () => onChange && onChange(tab.id),
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        minWidth: 64,
        padding: '4px 12px',
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        fontWeight: 500,
        color: on ? 'var(--primary-text)' : 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: tab.icon,
      size: 24,
      color: on ? 'var(--primary-text)' : 'var(--text-secondary)',
      fill: on ? 'var(--primary)' : undefined
    }), tab.label, badges[tab.id] && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 2,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--primary)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/posts/PostCard.jsx
try { (() => {
const GUTTER = 24;

/**
 * One Post, full-bleed. A Post has no edge of its own — the `--post-divider`
 * band between two of them is the only thing that separates them.
 */
function PostCard({
  authorName,
  authorPhotoUrl,
  householdName,
  timeAgo,
  isEdited = false,
  title,
  caption,
  pets = [],
  photos = [],
  liked = false,
  likeCount = 0,
  likedBySummary,
  commentCount = 0,
  showActions = false,
  onToggleLike,
  onOpenComments,
  onOpenActions,
  onOpen,
  style
}) {
  const [page, setPage] = React.useState(0);
  return /*#__PURE__*/React.createElement("article", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '8px 0',
      background: 'var(--post-surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: `0 ${GUTTER}px`
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.UserAvatar, {
    firstName: authorName ? authorName.split(' ')[0] : null,
    lastName: authorName ? authorName.split(' ')[1] : null,
    avatarUrl: authorPhotoUrl,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 15,
    fontWeight: "bold",
    numberOfLines: 1
  }, householdName || authorName), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary",
    numberOfLines: 1
  }, householdName ? `${authorName} · ` : '', timeAgo, isEdited ? ' · Edited' : '')), showActions && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "ellipsis",
    variant: "ghost",
    size: 20,
    accessibilityLabel: `Manage ${authorName}'s post`,
    onClick: onOpenActions
  })), (title || caption) && /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: `0 ${GUTTER}px`,
      cursor: onOpen ? 'pointer' : 'default'
    }
  }, title && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 17,
    fontWeight: "bold",
    numberOfLines: 2
  }, title), caption && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 15,
    numberOfLines: 2
  }, caption)), pets.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      padding: `0 ${GUTTER}px`
    }
  }, pets.map(pet => /*#__PURE__*/React.createElement("span", {
    key: pet.name,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px 4px 4px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--background-element)',
      boxShadow: 'inset 0 0 0 1px var(--border)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PetAvatar, {
    photoUrl: pet.photoUrl,
    size: 20
  }), /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary"
  }, pet.name)))), photos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      aspectRatio: '1 / 1',
      overflow: 'hidden',
      background: 'var(--post-divider)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: photos[page],
    alt: "",
    onClick: onOpen,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }), photos.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 4,
      padding: '8px 16px',
      borderRadius: 'var(--radius-full)',
      background: 'rgba(0, 0, 0, 0.35)'
    }
  }, photos.map((photo, at) => /*#__PURE__*/React.createElement("span", {
    key: photo,
    onClick: () => setPage(at),
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#FFFFFF',
      opacity: at === page ? 1 : 0.45,
      cursor: 'pointer'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `0 ${GUTTER}px`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginLeft: -4
    }
  }, /*#__PURE__*/React.createElement(ActionTarget, {
    label: liked ? 'Remove your like' : 'Like this post',
    onClick: onToggleLike
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "heart",
    size: 22,
    color: liked ? 'var(--like)' : 'var(--text-secondary)',
    fill: liked ? 'var(--like)' : undefined
  }), likeCount > 0 && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: liked ? 'like' : 'textSecondary'
  }, likeCount)), /*#__PURE__*/React.createElement(ActionTarget, {
    label: commentCount === 1 ? '1 comment' : `${commentCount} comments`,
    onClick: onOpenComments
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "comment",
    size: 22,
    color: "var(--text-secondary)"
  }), commentCount > 0 && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 14,
    color: "textSecondary"
  }, commentCount)), /*#__PURE__*/React.createElement(ActionTarget, {
    label: "Share"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "share",
    size: 22,
    color: "var(--text-secondary)"
  }))), likedBySummary && /*#__PURE__*/React.createElement(__ds_scope.AppText, {
    size: 13,
    color: "textSecondary",
    numberOfLines: 1,
    as: "div"
  }, likedBySummary)));
}
function ActionTarget({
  label,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 44,
      padding: '0 4px',
      border: 0,
      background: 'transparent',
      cursor: 'pointer'
    }
  }, children);
}
Object.assign(__ds_scope, { PostCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/posts/PostCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crumpet-ios/data.jsx
try { (() => {
/* Sample content for the Crumpet UI kit. Names and copy follow CONTEXT.md:
   Household, Member, Pet, Feed Time, Feed Log — never "meal" or "slot". */
const PHOTO = '../../assets/photo-placeholder.png';
const HOUSEHOLD = {
  name: 'The Doyles',
  members: 3,
  timezone: 'Australia/Melbourne'
};
const ME = {
  firstName: 'Sarah',
  lastName: 'Doyle',
  email: 'sarah@doyle.com',
  role: 'Owner'
};
const INITIAL_PETS = [{
  id: 'bailey',
  name: 'Bailey',
  summary: 'Dinner was due at 5:30 pm',
  occurrences: [{
    id: 'b1',
    label: 'Morning',
    time: '7:00 am',
    state: 'fed',
    detail: 'Sarah, 7:04 am'
  }, {
    id: 'b2',
    label: 'Lunch',
    time: '12:00 pm',
    state: 'missed'
  }, {
    id: 'b3',
    label: 'Dinner',
    time: '5:30 pm',
    state: 'due',
    detail: 'Half a tin of wet food + 1 cup dry'
  }]
}, {
  id: 'miso',
  name: 'Miso',
  summary: 'Logged twice today',
  occurrences: [{
    id: 'm1',
    label: 'Morning',
    time: '7:30 am',
    state: 'fed',
    detail: 'Tom, 7:22 am'
  }, {
    id: 'm2',
    label: 'Dinner',
    time: '6:00 pm',
    state: 'fed',
    detail: 'Sarah, 5:58 pm'
  }]
}];
const POSTS = [{
  id: 'p1',
  authorName: 'Tom Reilly',
  timeAgo: '2h ago',
  title: 'Beach morning',
  caption: 'She would not come out of the water. Fed at the car park after.',
  pets: [{
    name: 'Bailey'
  }],
  photos: [PHOTO, PHOTO],
  liked: false,
  likeCount: 2,
  likedBySummary: 'Liked by Sarah and 1 other',
  commentCount: 2
}, {
  id: 'p2',
  authorName: 'Sarah Doyle',
  timeAgo: 'Yesterday',
  title: 'Vet went fine',
  caption: 'Weighed in at 24.1kg. Back in six months.',
  pets: [{
    name: 'Bailey'
  }, {
    name: 'Miso'
  }],
  photos: [PHOTO],
  liked: true,
  likeCount: 1,
  likedBySummary: 'Liked by you',
  commentCount: 0,
  isEdited: true,
  mine: true
}];
const ALERTS = [{
  id: 'a1',
  glyph: 'circleAlert',
  text: 'Bailey’s lunch was missed',
  when: '1h ago',
  unread: true
}, {
  id: 'a2',
  glyph: 'image',
  text: 'Tom posted “Beach morning”',
  when: '2h ago',
  unread: true
}, {
  id: 'a3',
  glyph: 'heart',
  text: 'Tom liked your post “Vet went fine”',
  when: 'Yesterday'
}, {
  id: 'a4',
  glyph: 'comment',
  text: 'Tom commented on your post “Vet went fine”',
  when: 'Yesterday'
}, {
  id: 'a5',
  glyph: 'users',
  text: 'You changed Tom’s role',
  when: '3 days ago'
}];
Object.assign(window, {
  PHOTO,
  HOUSEHOLD,
  ME,
  INITIAL_PETS,
  POSTS,
  ALERTS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crumpet-ios/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crumpet-ios/home.jsx
try { (() => {
const {
  AppText,
  Icon,
  IconButton,
  MainButton,
  Divider,
  HomeBanner,
  Tile,
  PetCard,
  OccurrenceRow,
  EmptyState,
  SheetRow
} = window.CrumpetDesignSystem_02ecec;
const GUTTER = 24;

/** Home: the banner, one card per pet, the extra-feed door, the tile grid. */
function HomeScreen({
  pets,
  onLog,
  onOpenInbox,
  unread
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `64px ${GUTTER}px 120px`,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(HomeBanner, {
    timeOfDay: "dusk",
    greeting: "Good evening, Sarah",
    detail: "Saturday, 30 August",
    trailing: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      name: "bell",
      variant: "ghost",
      size: 22,
      color: "var(--banner-ink-dusk)",
      accessibilityLabel: "Open your inbox",
      onClick: onOpenInbox
    }), unread > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 8,
        background: 'var(--error)',
        color: '#fff',
        font: '700 10px/16px var(--font-body)',
        textAlign: 'center'
      }
    }, unread))
  }), /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 30,
    as: "h1",
    style: {
      marginTop: 8
    }
  }, "Today"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, pets.map(pet => /*#__PURE__*/React.createElement(PetCard, {
    key: pet.id,
    name: pet.name,
    summary: pet.summary,
    isAllLogged: pet.occurrences.every(o => o.state === 'fed')
  }, pet.occurrences.map(occurrence => /*#__PURE__*/React.createElement(OccurrenceRow, {
    key: occurrence.id,
    label: occurrence.label,
    time: occurrence.time,
    detail: occurrence.detail,
    state: occurrence.state,
    isNested: true,
    onLog: occurrence.state === 'fed' ? undefined : () => onLog(pet.id, occurrence.id)
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(MainButton, {
    text: "Log something else",
    variant: "text"
  }), /*#__PURE__*/React.createElement(AppText, {
    size: 13,
    color: "textSecondary",
    align: "center"
  }, "A snack, or a feed that is not on the schedule.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Tile, {
    label: "Pets",
    subtitle: "Pet management",
    icon: "pawPrint"
  }), /*#__PURE__*/React.createElement(Tile, {
    label: "Activity",
    subtitle: "Feed history",
    icon: "list"
  })));
}

/** The Inbox: household news plus anything addressed to you, last seven days. */
function InboxScreen({
  alerts,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `64px 0 120px`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: `0 ${GUTTER - 12}px 8px`
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "caretLeft",
    variant: "ghost",
    size: 22,
    accessibilityLabel: "Back to Home",
    onClick: onBack
  }), /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 22
  }, "Inbox")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `0 ${GUTTER}px`
    }
  }, /*#__PURE__*/React.createElement(AppText, {
    size: 13,
    color: "textSecondary",
    as: "div",
    style: {
      marginBottom: 12
    }
  }, "The last seven days."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--background-element)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-medium)',
      overflow: 'hidden'
    }
  }, alerts.map((alert, index) => /*#__PURE__*/React.createElement("div", {
    key: alert.id
  }, index > 0 && /*#__PURE__*/React.createElement(Divider, {
    inset: 56
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: alert.glyph,
    size: 20,
    color: alert.glyph === 'heart' ? 'var(--like)' : 'var(--text-secondary)',
    fill: alert.glyph === 'heart' ? 'var(--like)' : undefined
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(AppText, {
    size: 15
  }, alert.text), /*#__PURE__*/React.createElement(AppText, {
    size: 13,
    color: "textSecondary"
  }, alert.when)), alert.unread && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      marginTop: 6,
      borderRadius: '50%',
      background: 'var(--primary)'
    }
  })))))));
}

/** The Log tray: pick the pet, then the feed it satisfies. Never a default. */
function LogTray({
  pets,
  onPick,
  onClose
}) {
  const [petId, setPetId] = React.useState(null);
  const pet = pets.find(entry => entry.id === petId);
  const open = pet ? pet.occurrences.filter(o => o.state !== 'fed') : [];
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 80,
      background: 'rgba(0, 0, 0, 0.32)',
      display: 'flex',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: event => event.stopPropagation(),
    style: {
      width: '100%',
      padding: `12px ${GUTTER}px 40px`,
      background: 'var(--background-sheet)',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      boxShadow: 'var(--shadow-large)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 5,
      borderRadius: 100,
      background: 'var(--border)',
      margin: '0 auto 16px'
    }
  }), /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 22,
    as: "div",
    style: {
      marginBottom: 4
    }
  }, pet ? `Which feed?` : 'Log a feed'), /*#__PURE__*/React.createElement(AppText, {
    size: 14,
    color: "textSecondary",
    as: "div",
    style: {
      marginBottom: 16
    }
  }, pet ? `Naming the feed is what lets ${pet.name}'s household see it was covered.` : 'Who are you logging for?'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, !pet && pets.map(entry => /*#__PURE__*/React.createElement(SheetRow, {
    key: entry.id,
    label: entry.name,
    icon: "pawPrint",
    onClick: () => setPetId(entry.id)
  })), pet && open.map(occurrence => /*#__PURE__*/React.createElement(SheetRow, {
    key: occurrence.id,
    label: occurrence.label,
    detail: occurrence.time,
    icon: "utensils",
    onClick: () => {
      onPick(pet.id, occurrence.id);
      onClose();
    }
  })), pet && open.length === 0 && /*#__PURE__*/React.createElement(EmptyState, {
    icon: "check",
    title: "Everything is logged",
    description: `${pet.name} has nothing outstanding today.`
  }), pet && /*#__PURE__*/React.createElement(SheetRow, {
    label: "Something else",
    detail: "A snack, or an unscheduled feed",
    icon: "plus",
    onClick: onClose
  }))));
}
Object.assign(window, {
  HomeScreen,
  InboxScreen,
  LogTray
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crumpet-ios/home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crumpet-ios/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crumpet-ios/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crumpet-ios/posts.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  AppText,
  Icon,
  IconButton,
  MainButton,
  PostCard,
  UserAvatar,
  StatusPill,
  SettingsRow,
  Divider,
  EmptyState
} = window.CrumpetDesignSystem_02ecec;
const KIT_GUTTER = 24;

/** Posts: every household the member belongs to, newest first, full-bleed. */
function PostsScreen({
  posts,
  onToggleLike
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 56,
      paddingBottom: 120,
      background: 'var(--post-divider)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `0 ${KIT_GUTTER}px 12px`,
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 30,
    as: "h1",
    style: {
      flex: 1
    }
  }, "Posts"), /*#__PURE__*/React.createElement(IconButton, {
    name: "plus",
    variant: "secondary",
    size: 20,
    accessibilityLabel: "Share a photo"
  })), posts.map((post, index) => /*#__PURE__*/React.createElement("div", {
    key: post.id
  }, index > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12,
      background: 'var(--post-divider)'
    }
  }), /*#__PURE__*/React.createElement(PostCard, _extends({}, post, {
    showActions: Boolean(post.mine),
    onToggleLike: () => onToggleLike(post.id)
  })))));
}

/** Profile: who you are, the household you are in, and your own Posts. */
function ProfileScreen({
  me,
  household,
  posts,
  onToggleLike
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 56,
      paddingBottom: 120,
      background: 'var(--post-divider)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `0 ${KIT_GUTTER}px 16px`,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      background: 'var(--background)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(UserAvatar, {
    firstName: me.firstName,
    lastName: me.lastName,
    size: 96
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -8,
      bottom: -8,
      padding: 2,
      borderRadius: 'var(--radius-full)',
      background: 'var(--background)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "camera",
    size: 18,
    accessibilityLabel: "Change your profile photo"
  }))), /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 22,
    as: "div"
  }, me.firstName, " ", me.lastName), /*#__PURE__*/React.createElement(AppText, {
    size: 14,
    color: "textSecondary",
    as: "div"
  }, me.email), /*#__PURE__*/React.createElement(StatusPill, {
    label: me.role
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, [['128', 'Feeds logged'], ['12', 'Posts'], ['2', 'Pets']].map(([value, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(AppText, {
    variant: "header",
    size: 19,
    as: "div"
  }, value), /*#__PURE__*/React.createElement(AppText, {
    size: 13,
    color: "textSecondary",
    as: "div"
  }, label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      borderRadius: 'var(--radius-tile)',
      background: 'var(--background-element)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "house",
    size: 18,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement(AppText, {
    size: 16,
    numberOfLines: 1,
    style: {
      flex: 1
    }
  }, household.name), /*#__PURE__*/React.createElement(AppText, {
    size: 14,
    color: "textSecondary"
  }, household.members, " members")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--background-element)',
      borderRadius: 'var(--radius-card)',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement(SettingsRow, {
    icon: "bell",
    label: "Notifications",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(SettingsRow, {
    icon: "users",
    label: "Members",
    value: `${household.members} members`,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(SettingsRow, {
    icon: "sunMoon",
    label: "Appearance",
    value: "System",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(SettingsRow, {
    icon: "creditCard",
    label: "Subscription",
    isSoon: true
  }), /*#__PURE__*/React.createElement(SettingsRow, {
    icon: "logOut",
    label: "Log out",
    onClick: () => {}
  })), /*#__PURE__*/React.createElement(AppText, {
    size: 17,
    color: "textSecondary",
    as: "div"
  }, "Posts")), posts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--background)'
    }
  }) : posts.map((post, index) => /*#__PURE__*/React.createElement("div", {
    key: post.id
  }, index > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12,
      background: 'var(--post-divider)'
    }
  }), /*#__PURE__*/React.createElement(PostCard, _extends({}, post, {
    showActions: true,
    onToggleLike: () => onToggleLike(post.id)
  })))));
}
Object.assign(window, {
  PostsScreen,
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crumpet-ios/posts.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AppText = __ds_scope.AppText;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.ICON_MAP = __ds_scope.ICON_MAP;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.MainButton = __ds_scope.MainButton;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.HomeBanner = __ds_scope.HomeBanner;

__ds_ns.PetAvatar = __ds_scope.PetAvatar;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Tile = __ds_scope.Tile;

__ds_ns.UserAvatar = __ds_scope.UserAvatar;

__ds_ns.OccurrenceRow = __ds_scope.OccurrenceRow;

__ds_ns.PetCard = __ds_scope.PetCard;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.ToggleSwitch = __ds_scope.ToggleSwitch;

__ds_ns.SettingsRow = __ds_scope.SettingsRow;

__ds_ns.SheetRow = __ds_scope.SheetRow;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.PostCard = __ds_scope.PostCard;

})();

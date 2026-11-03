// Lucide glyphs from lucide-angular@1.0.0. See LUCIDE-LICENSE.txt.
// MoreVertical is now named EllipsisVertical upstream; the same vertical-dot glyph.
// User-approved Angular 22 compatibility alternative; only the approved action map.
export const ACTION_ICONS = {
  "chevronDown": [["path", {"d":"m6 9 6 6 6-6"}]],
  "save": [
    [
      "path",
      {
        "d": "M20 6 9 17l-5-5"
      }
    ]
  ],
  "edit": [
    [
      "path",
      {
        "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ],
    [
      "path",
      {
        "d": "m15 5 4 4"
      }
    ]
  ],
  "delete": [
    [
      "path",
      {
        "d": "M10 11v6"
      }
    ],
    [
      "path",
      {
        "d": "M14 11v6"
      }
    ],
    [
      "path",
      {
        "d": "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
      }
    ],
    [
      "path",
      {
        "d": "M3 6h18"
      }
    ],
    [
      "path",
      {
        "d": "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      }
    ]
  ],
  "view": [
    [
      "path",
      {
        "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "3"
      }
    ]
  ],
  "download": [
    [
      "path",
      {
        "d": "M12 15V3"
      }
    ],
    [
      "path",
      {
        "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      }
    ],
    [
      "path",
      {
        "d": "m7 10 5 5 5-5"
      }
    ]
  ],
  "refresh": [
    [
      "path",
      {
        "d": "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
      }
    ],
    [
      "path",
      {
        "d": "M21 3v5h-5"
      }
    ]
  ],
  "add": [
    [
      "path",
      {
        "d": "M5 12h14"
      }
    ],
    [
      "path",
      {
        "d": "M12 5v14"
      }
    ]
  ],
  "close": [
    [
      "path",
      {
        "d": "M18 6 6 18"
      }
    ],
    [
      "path",
      {
        "d": "m6 6 12 12"
      }
    ]
  ],
  "back": [
    [
      "path",
      {
        "d": "m12 19-7-7 7-7"
      }
    ],
    [
      "path",
      {
        "d": "M19 12H5"
      }
    ]
  ],
  "more": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "5",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "19",
        "r": "1"
      }
    ]
  ],
  "info": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "10"
      }
    ],
    [
      "path",
      {
        "d": "M12 16v-4"
      }
    ],
    [
      "path",
      {
        "d": "M12 8h.01"
      }
    ]
  ],
  "search": [
    [
      "path",
      {
        "d": "m21 21-4.34-4.34"
      }
    ],
    [
      "circle",
      {
        "cx": "11",
        "cy": "11",
        "r": "8"
      }
    ]
  ]
} as const;
export type PsAction = keyof typeof ACTION_ICONS;

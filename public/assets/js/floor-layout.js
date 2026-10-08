"use strict";
(() => {
  // Presentation coordinates for Lumina's fictional concept; inventory IDs and booking rules stay server-owned.
  const rooms = {
    r_vip: [30, 30, 280, 300], r_common: [350, 30, 510, 600],
    r_group: [30, 370, 280, 360], r_terrace: [900, 30, 180, 700],
  };
  const positions = {
    V1: [100, 130, "Suites · upper left"], V2: [230, 130, "Suites · upper right"],
    V3: [100, 265, "Suites · lower left"], V4: [230, 265, "Suites · lower right"],
    C1: [390, 130, "Main Dining · upper left, outer table"], C2: [475, 130, "Main Dining · upper left, beside the central aisle"],
    C3: [655, 130, "Main Dining · upper right, beside the central aisle"], C4: [760, 130, "Main Dining · upper right, outer table"],
    C5: [390, 260, "Main Dining · middle left, outer table"], C6: [475, 255, "Main Dining · middle left, beside the central aisle"],
    C7: [760, 255, "Main Dining · middle right, above the cross aisle"],
    C8: [390, 405, "Main Dining · lower left, outer table"], C9: [475, 400, "Main Dining · lower left, beside the central aisle"],
    C10: [760, 400, "Main Dining · lower right, below the cross aisle"],
    C11: [465, 540, "Main Dining · entrance side, left of the central aisle"], C12: [655, 540, "Main Dining · entrance side, right of the central aisle"],
    G1: [80, 445, "The Long Room · upper group area, beside G2"], G2: [80, 555, "The Long Room · middle group area, beside G1"],
    G3: [80, 655, "The Long Room · lower group area"],
    T1: [966, 125, "Terrace · upper end"], T2: [966, 225, "Terrace · upper seating area"],
    T3: [960, 325, "Terrace · middle, above the access point"], T4: [960, 425, "Terrace · middle, below the access point"],
    T5: [944, 525, "Terrace · lower seating area"], T6: [966, 635, "Terrace · lower end"],
  };
  const node = (tag, attrs, text) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text) el.textContent = text;
    return el;
  };
  function create(catalog) {
    return {
      rooms: catalog.rooms.map(room => {
        const placement = rooms[room.code];
        return placement ? {...room, floor_x: placement[0], floor_y: placement[1], floor_w: placement[2], floor_h: placement[3]} : {...room};
      }),
      tables: catalog.tables.map(table => positions[table.code] ? {...table, pos_x: positions[table.code][0], pos_y: positions[table.code][1]} : {...table}),
    };
  }
  function guides(svg) {
    const group = node("g", {class: "floor-guide", "aria-hidden": "true"});
    for (const path of ["M605 775V80", "M330 180V705H605", "M330 360H935", "M310 180H330", "M310 535H330"])
      group.append(node("path", {d: path, class: "floor-aisle"}));
    for (const path of ["M310 160V205", "M310 515V555", "M350 335V385", "M575 630H635", "M860 335V385", "M900 335V385"])
      group.append(node("path", {d: path, class: "floor-door"}));
    group.append(node("text", {x: 605, y: 798, "text-anchor": "middle", class: "floor-label"}, "Entrance"));
    group.append(node("text", {x: 618, y: 495, class: "floor-aisle-label", transform: "rotate(-90 618 495)"}, "Central aisle"));
    svg.append(group);
  }
  function location(table) { return positions[table.code]?.[2] || "Position shown in the concept floor plan"; }
  function roomPreview(catalog, selected) {
    const layout = create(catalog), room = layout.rooms.find(r => Number(r.id) === Number(selected.room_id));
    if (!room) return node("svg", {hidden: ""});
    const svg = node("svg", {class: "showcase-room-map", viewBox: `${room.floor_x-12} ${room.floor_y-12} ${Number(room.floor_w)+24} ${Number(room.floor_h)+24}`, role: "img", "aria-label": `Concept position of ${selected.code} in ${room.name}`});
    svg.append(node("rect", {x: room.floor_x, y: room.floor_y, width: room.floor_w, height: room.floor_h, rx: 8, class: "floor-room"}));
    svg.append(node("text", {x: room.floor_x+12, y: room.floor_y+24, class: "floor-label"}, room.name));
    for (const table of layout.tables.filter(t => Number(t.room_id) === Number(room.id))) {
      const round = table.shape === "round", attrs = round ? {cx: table.pos_x, cy: table.pos_y, r: table.radius} : {x: table.pos_x, y: table.pos_y, width: table.pos_w, height: table.pos_h, rx: 7};
      const shape = node(round ? "circle" : "rect", {...attrs, class: "floor-position-table"+(table.code===selected.code?" is-current":"")});
      shape.append(node("title", {}, table.code+(table.code===selected.code?" · previewed table":"")));svg.append(shape);
      svg.append(node("text", {x: round ? table.pos_x : table.pos_x+Number(table.pos_w)/2, y: round ? table.pos_y : table.pos_y+Number(table.pos_h)/2, "text-anchor": "middle", "dominant-baseline": "middle", class: "floor-code"}, table.code));
    }
    return svg;
  }
  window.LuminaFloorLayout = {create, guides, location, roomPreview, viewBox: "0 0 1100 820"};
})();

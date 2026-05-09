-- P3 Multi-property: chain directory + central inventory view
CREATE OR REPLACE VIEW org_chain_directory AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  count(h.id) AS hotels_count,
  count(h.id) FILTER (WHERE h.active = true) AS active_hotels_count
FROM organizations o
LEFT JOIN hotels h ON h.organization_id = o.id
GROUP BY o.id, o.name;

CREATE OR REPLACE VIEW org_central_inventory AS
SELECT
  h.organization_id,
  h.id AS hotel_id,
  h.name AS hotel_name,
  count(r.id) AS total_rooms,
  count(r.id) FILTER (WHERE r.status = 'available') AS available_rooms,
  count(r.id) FILTER (WHERE r.status = 'occupied') AS occupied_rooms,
  count(r.id) FILTER (WHERE r.status = 'maintenance') AS maintenance_rooms,
  count(r.id) FILTER (WHERE r.status = 'blocked') AS blocked_rooms
FROM hotels h
LEFT JOIN rooms r ON r.hotel_id = h.id
GROUP BY h.organization_id, h.id, h.name;

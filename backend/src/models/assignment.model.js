const { query } = require('../config/db');

async function createAssignment({
  incident_id,
  resource_id,
  recommended_score,
  recommended_reasons,
  eta,
  replaced_assignment_id,
  status,
}) {
  const { rows } = await query(
    `INSERT INTO assignments
       (
         incident_id,
         resource_id,
         status,
         recommended_score,
         recommended_reasons,
         eta,
         replaced_assignment_id
       )
     VALUES
       (
         $1,
         $2,
         COALESCE(
           $3::assignment_status,
           'PENDING_APPROVAL'::assignment_status
         ),
         $4,
         $5,
         $6,
         $7
       )
     RETURNING *`,
    [
      incident_id,
      resource_id,
      status ?? null,
      recommended_score ?? null,
      JSON.stringify(recommended_reasons ?? []),
      eta ?? null,
      replaced_assignment_id ?? null,
    ]
  );

  return rows[0];
}


async function getAssignmentById(id) {
  const { rows } = await query(
    `SELECT *
     FROM assignments
     WHERE id = $1`,
    [id]
  );

  return rows[0] || null;
}


async function listForIncident(incidentId) {
  const { rows } = await query(
    `SELECT *
     FROM assignments
     WHERE incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId]
  );

  return rows;
}


async function updateAssignmentStatus(
  id,
  {
    status,
    approved_by,
    setApprovedAt = false,
  }
) {
  const sets = [
    `status = $1::assignment_status`,
  ];

  const params = [status];

  if (approved_by !== undefined) {
    params.push(approved_by);

    sets.push(
      `approved_by = $${params.length}`
    );
  }

  if (setApprovedAt) {
    sets.push(
      `approved_at = now()`
    );
  }

  params.push(id);

  const { rows } = await query(
    `UPDATE assignments
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );

  return rows[0] || null;
}


async function getActiveAssignmentForResource(
  resourceId
) {
  const { rows } = await query(
    `SELECT *
     FROM assignments
     WHERE resource_id = $1
       AND status IN (
         'APPROVED'::assignment_status,
         'ACTIVE'::assignment_status
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [resourceId]
  );

  return rows[0] || null;
}


module.exports = {
  createAssignment,
  getAssignmentById,
  listForIncident,
  updateAssignmentStatus,
  getActiveAssignmentForResource,
};
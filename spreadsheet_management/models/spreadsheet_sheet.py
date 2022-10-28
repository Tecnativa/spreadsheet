import base64
import json

from odoo import _, api, fields, models


class SpreadsheetSheet(models.Model):
    _name = "spreadsheet.sheet"
    _description = "Spreadsheet Sheet"
    _order = "sequence"

    name = fields.Char(required=True)
    data = fields.Binary(required=True, default=lambda self: self._default_data())
    raw = fields.Binary(compute="_compute_raw")
    thumbnail = fields.Binary()
    sequence = fields.Integer()
    group_ids = fields.Many2many(
        "res.groups", default=lambda self: self.env.ref("base.group_user")
    )

    def _default_data(self):
        data = json.dumps(self._empty_workbook_data())
        return base64.b64encode(data.encode())

    def _empty_workbook_data(self):
        """Create an empty spreadsheet workbook.
        The sheet name should be the same for all users to allow consistent references
        in formulas. It is translated for the user creating the spreadsheet.
        """
        return {
            "version": 1,
            "sheets": [
                {
                    "id": "sheet1",
                    "name": _("Sheet1"),
                }
            ],
        }

    @api.depends("data")
    def _compute_raw(self):
        for sheet in self:
            sheet.raw = base64.decodebytes(sheet.data)

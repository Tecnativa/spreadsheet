# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    "name": "Spreadsheet sheets management",
    "version": "16.0.1.0.0",
    "category": "Tools",
    "summary": "Spreadsheet Sheets",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "depends": ["spreadsheet"],
    "demo": [],
    "installable": True,
    "auto_install": False,
    "license": "LGPL-3",
    "data": [
        "security/ir.model.access.csv",
        "views/menu_views.xml",
        "views/spreadsheet_sheet_views.xml",
    ],
    "assets": {
        "spreadsheet.o_spreadsheet": [
            "spreadsheet_management/static/src/bundle/**/*.js",
            "spreadsheet_management/static/src/bundle/**/*.xml",
        ],
        "web.assets_backend": [
            "spreadsheet_management/static/src/assets/**/*.js",
            "spreadsheet_management/static/src/**/*.scss",
        ],
    },
}

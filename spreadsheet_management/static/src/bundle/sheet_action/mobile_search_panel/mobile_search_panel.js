/** @odoo-module */

import {_t} from "@web/core/l10n/translation";

const {Component, useState} = owl;

export class SheetMobileSearchPanel extends Component {
    setup() {
        this.state = useState({isOpen: false});
    }

    get searchBarText() {
        return this.props.activeSheet
            ? this.props.activeSheet.displayName
            : _t("Choose a sheet....");
    }

    onSheetSelected(sheetId) {
        this.props.onSheetSelected(sheetId);
        this.state.isOpen = false;
    }

    openSheetSelection() {
        const sheets = this.props.groups.map((group) => group.sheets).flat();
        if (sheets.length > 1) {
            this.state.isOpen = true;
        }
    }
}

SheetMobileSearchPanel.template = "documents_spreadsheet.SheetMobileSearchPanel";
SheetMobileSearchPanel.props = {
    /**
     * (sheetId: number) => void
     */
    onSheetSelected: Function,
    groups: Object,
    activeSheet: {
        type: Object,
        optional: true,
    },
};

import usePermissions from "../../auth/hooks/usePermissions";


const PERMISSION_MODULE_KEY = "price-pending";


export default function usePricePendingPermissions() {
    const {
        isLoading,
        canFunction,
        canViewFunction,
        canEditFunction
    } = usePermissions();

    return {
        isLoadingPermissions: isLoading,
        moduleKey: PERMISSION_MODULE_KEY,
        canFunction,
        canViewFunction,
        canEditFunction,
        canSearch: canFunction(PERMISSION_MODULE_KEY, "search_laboratory"),
        canFilterUpdated: canFunction(PERMISSION_MODULE_KEY, "filter_updated"),
        canFilterOutdated: canFunction(PERMISSION_MODULE_KEY, "filter_outdated"),
        canFilterBranch: canFunction(PERMISSION_MODULE_KEY, "filter_branch"),
        canAddLaboratory: canFunction(PERMISSION_MODULE_KEY, "add_laboratory"),
        canEditLaboratory:
            canEditFunction(PERMISSION_MODULE_KEY, "edit_laboratory") ||
            canEditFunction(PERMISSION_MODULE_KEY, "laboratory"),
        canEditObservation:
            canEditFunction(PERMISSION_MODULE_KEY, "edit_observation") ||
            canEditFunction(PERMISSION_MODULE_KEY, "observation"),
        canEditValues: canEditFunction(PERMISSION_MODULE_KEY, "edit_values"),
        canRemoveLaboratory: canFunction(PERMISSION_MODULE_KEY, "remove_laboratory"),
        canRefresh: canFunction(PERMISSION_MODULE_KEY, "refresh_data"),
        canExport: canFunction(PERMISSION_MODULE_KEY, "export_excel"),
        canViewIgnoredFiles: canFunction(PERMISSION_MODULE_KEY, "view_ignored_files"),
        canViewIndustryGlobalCode: canViewFunction(
            PERMISSION_MODULE_KEY,
            "industry_global_code"
        ),
        canViewLaboratory: canViewFunction(PERMISSION_MODULE_KEY, "laboratory"),
        canViewObservation: canViewFunction(PERMISSION_MODULE_KEY, "observation")
    };
}

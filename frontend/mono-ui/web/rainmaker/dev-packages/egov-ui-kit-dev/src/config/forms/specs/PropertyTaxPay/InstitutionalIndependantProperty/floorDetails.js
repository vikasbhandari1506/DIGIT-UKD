import { MDMS } from "egov-ui-kit/utils/endPoints";
import { subUsageType, occupancy, builtArea, floorName, beforeInitForm,annualRent } from "../utils/reusableFields";

const formConfig = {
  name: "floorDetails",
  fields: {
    usageType: {
      id: "assessment-usageType",
      jsonPath: "Properties[0].propertyDetails[0].units[0].usageCategoryMinor",
      type: "textfield",
      floatingLabelText: "PT_FORM2_USAGE_TYPE",
      // value: "Institutional",
      hintText: "PT_COMMONS_SELECT_PLACEHOLDER",
      value: "PROPERTYTAX_BILLING_SLAB_INSTITUTIONAL",
      required: true,
      disabled: true,
      numcols: 4,
    },
    ...subUsageType,
    ...occupancy,
    ...builtArea,
    ...floorName,
    ...annualRent
  },
  isFormValid: false,
  ...beforeInitForm,
};

export default formConfig;

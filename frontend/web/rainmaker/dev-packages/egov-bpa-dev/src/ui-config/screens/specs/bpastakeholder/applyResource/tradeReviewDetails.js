import {
  getCommonCard,
  getCommonGrayCard,
  getCommonTitle
} from "egov-ui-framework/ui-config/screens/specs/utils";

import { getFeesEstimateCard, getDialogButton } from "../../utils";

import { getOrganizationDetails } from "./review-organization";
import { getReviewOwner } from "./review-owner";
import { getLocationDetails } from "./review-location";
import { getReviewDocuments } from "./review-documents";

const estimate = getCommonGrayCard({
  estimateSection: getFeesEstimateCard({
    sourceJsonPath: "LicensesTemp[0].estimateCardData"
  })
});

const reviewOrganizationDetails = getOrganizationDetails();

const reviewLocationDetails = getLocationDetails();
const reviewOwnerDetails = getReviewOwner();

const reviewDocumentDetails = getReviewDocuments();

export const tradeReviewDetails = getCommonCard({
  header: getCommonTitle({
    labelName: "Please review your Application and Submit",
    labelKey: "TL_SUMMARY_HEADER"
  }),
  estimate,
  viewBreakupButton: getDialogButton(
    "VIEW BREAKUP",
    "TL_PAYMENT_VIEW_BREAKUP",
    "apply"
  ),
  reviewOrganizationDetails,
  reviewOwnerDetails,
  reviewLocationDetails,
  reviewDocumentDetails
});

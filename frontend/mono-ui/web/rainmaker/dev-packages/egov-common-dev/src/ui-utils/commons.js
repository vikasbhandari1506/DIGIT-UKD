import { convertDateToEpoch } from "egov-ui-framework/ui-config/screens/specs/utils";
import {
  handleScreenConfigurationFieldChange as handleField,
  prepareFinalObject,
  toggleSnackbar,
  toggleSpinner
} from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { httpRequest } from "egov-ui-framework/ui-utils/api";
import { getTransformedLocale, getFileUrlFromAPI } from "egov-ui-framework/ui-utils/commons";
import { getTenantId } from "egov-ui-kit/utils/localStorageUtils";
import jp from "jsonpath";
import get from "lodash/get";
import set from "lodash/set";
import store from "ui-redux/store";
import { getTranslatedLabel } from "../ui-config/screens/specs/utils";
import printJS from 'print-js';
import axios from 'axios';
import { getFinancialYearFromEPOCH } from "egov-ui-kit/redux/properties/actions";

const handleDeletedCards = (jsonObject, jsonPath, key) => {
  let originalArray = get(jsonObject, jsonPath, []);
  let modifiedArray = originalArray.filter(element => {
    return element.hasOwnProperty(key) || !element.hasOwnProperty("isDeleted");
  });
  modifiedArray = modifiedArray.map(element => {
    if (element.hasOwnProperty("isDeleted")) {
      element["isActive"] = false;
    }
    return element;
  });
  set(jsonObject, jsonPath, modifiedArray);
};

export const getLocaleLabelsforTL = (label, labelKey, localizationLabels) => {
  if (labelKey) {
    let translatedLabel = getTranslatedLabel(labelKey, localizationLabels);
    if (!translatedLabel || labelKey === translatedLabel) {
      return label;
    } else {
      return translatedLabel;
    }
  } else {
    return label;
  }
};

export const findItemInArrayOfObject = (arr, conditionCheckerFn) => {
  for (let i = 0; i < arr.length; i++) {
    if (conditionCheckerFn(arr[i])) {
      return arr[i];
    }
  }
};


export const getSearchResults = async (queryObject,requestBody,searchURL="/property-services/property/_search") => {
  try {
    store.dispatch(toggleSpinner());
    const response = await httpRequest(
      "post",
     // "/firenoc-services/v1/_search",
     searchURL,
      "",
      queryObject
    );
    store.dispatch(toggleSpinner());
    return response;
  } catch (error) {
    store.dispatch(
      toggleSnackbar(
        true,
        { labelName: error.message, labelKey: error.message },
        "error"
      )
    );
    throw error;
  }
};

export const createUpdateNocApplication = async (state, dispatch, status) => {
  let nocId = get(
    state,
    "screenConfiguration.preparedFinalObject.FireNOCs[0].id"
  );
  let method = nocId ? "UPDATE" : "CREATE";
  try {
    let payload = get(
      state.screenConfiguration.preparedFinalObject,
      "FireNOCs",
      []
    );
    let tenantId = get(
      state.screenConfiguration.preparedFinalObject,
      "FireNOCs[0].fireNOCDetails.propertyDetails.address.city",
      getTenantId()
    );
    set(payload[0], "tenantId", tenantId);
    set(payload[0], "fireNOCDetails.action", status);

    // Get uploaded documents from redux
    let reduxDocuments = get(
      state,
      "screenConfiguration.preparedFinalObject.documentsUploadRedux",
      {}
    );

    handleDeletedCards(payload[0], "fireNOCDetails.buildings", "id");
    handleDeletedCards(
      payload[0],
      "fireNOCDetails.applicantDetails.owners",
      "id"
    );

    let buildings = get(payload, "[0].fireNOCDetails.buildings", []);
    buildings.forEach((building, index) => {
      // GET UOMS FOR THE SELECTED BUILDING TYPE
      let requiredUoms = get(
        state,
        "screenConfiguration.preparedFinalObject.applyScreenMdmsData.firenoc.BuildingType",
        []
      ).filter(buildingType => {
        return buildingType.code === building.usageType;
      });
      requiredUoms = get(requiredUoms, "[0].uom", []);
      // GET UNIQUE UOMS LIST INCLUDING THE DEFAULT
      let allUoms = [
        ...new Set([
          ...requiredUoms,
          ...[
            "NO_OF_FLOORS",
            "NO_OF_BASEMENTS",
            "PLOT_SIZE",
            "BUILTUP_AREA",
            "HEIGHT_OF_BUILDING"
          ]
        ])
      ];
      let finalUoms = [];
      allUoms.forEach(uom => {
        let value = get(building.uomsMap, uom);
        value &&
          finalUoms.push({
            code: uom,
            value: parseInt(value),
            isActiveUom: requiredUoms.includes(uom) ? true : false,
            active: true
          });
      });

      // Quick fix to repair old uoms
      let oldUoms = get(
        payload[0],
        `fireNOCDetails.buildings[${index}].uoms`,
        []
      );
      oldUoms.forEach((oldUom, oldUomIndex) => {
        set(
          payload[0],
          `fireNOCDetails.buildings[${index}].uoms[${oldUomIndex}].isActiveUom`,
          false
        );
        set(
          payload[0],
          `fireNOCDetails.buildings[${index}].uoms[${oldUomIndex}].active`,
          false
        );
      });
      // End Quick Fix

      set(payload[0], `fireNOCDetails.buildings[${index}].uoms`, [
        ...finalUoms,
        ...oldUoms
      ]);

      // Set building documents
      let uploadedDocs = [];
      jp.query(reduxDocuments, "$.*").forEach(doc => {
        if (doc.documents && doc.documents.length > 0) {
          if (
            doc.documentSubCode &&
            doc.documentSubCode.startsWith("BUILDING.BUILDING_PLAN")
          ) {
            if (doc.documentCode === building.name) {
              uploadedDocs = [
                ...uploadedDocs,
                {
                  tenantId: tenantId,
                  documentType: doc.documentSubCode,
                  fileStoreId: doc.documents[0].fileStoreId
                }
              ];
            }
          }
        }
      });
      set(
        payload[0],
        `fireNOCDetails.buildings[${index}].applicationDocuments`,
        uploadedDocs
      );
    });

    // Set owners & other documents
    let ownerDocuments = [];
    let otherDocuments = [];
    jp.query(reduxDocuments, "$.*").forEach(doc => {
      if (doc.documents && doc.documents.length > 0) {
        if (doc.documentType === "OWNER") {
          ownerDocuments = [
            ...ownerDocuments,
            {
              tenantId: tenantId,
              documentType: doc.documentSubCode
                ? doc.documentSubCode
                : doc.documentCode,
              fileStoreId: doc.documents[0].fileStoreId
            }
          ];
        } else if (!doc.documentSubCode) {
          // SKIP BUILDING PLAN DOCS
          otherDocuments = [
            ...otherDocuments,
            {
              tenantId: tenantId,
              documentType: doc.documentCode,
              fileStoreId: doc.documents[0].fileStoreId
            }
          ];
        }
      }
    });

    set(
      payload[0],
      "fireNOCDetails.applicantDetails.additionalDetail.documents",
      ownerDocuments
    );
    set(
      payload[0],
      "fireNOCDetails.additionalDetail.documents",
      otherDocuments
    );

    // Set Channel and Financial Year
    process.env.REACT_APP_NAME === "Citizen"
      ? set(payload[0], "fireNOCDetails.channel", "CITIZEN")
      : set(payload[0], "fireNOCDetails.channel", "COUNTER");
    set(payload[0], "fireNOCDetails.financialYear", "2019-20");

    // Set Dates to Epoch
    let owners = get(payload[0], "fireNOCDetails.applicantDetails.owners", []);
    owners.forEach((owner, index) => {
      set(
        payload[0],
        `fireNOCDetails.applicantDetails.owners[${index}].dob`,
        convertDateToEpoch(get(owner, "dob"))
      );
    });

    let response;
    if (method === "CREATE") {
      response = await httpRequest(
        "post",
        "/firenoc-services/v1/_create",
        "",
        [],
        { FireNOCs: payload }
      );
      response = furnishNocResponse(response);
      dispatch(prepareFinalObject("FireNOCs", response.FireNOCs));
      setApplicationNumberBox(state, dispatch);
    } else if (method === "UPDATE") {
      response = await httpRequest(
        "post",
        "/firenoc-services/v1/_update",
        "",
        [],
        { FireNOCs: payload }
      );
      response = furnishNocResponse(response);
      dispatch(prepareFinalObject("FireNOCs", response.FireNOCs));
    }

    return { status: "success", message: response };
  } catch (error) {
    dispatch(toggleSnackbar(true, { labelName: error.message }, "error"));

    // Revert the changed pfo in case of request failure
    let fireNocData = get(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs",
      []
    );
    fireNocData = furnishNocResponse({ FireNOCs: fireNocData });
    dispatch(prepareFinalObject("FireNOCs", fireNocData.FireNOCs));

    return { status: "failure", message: error };
  }
};

export const prepareDocumentsUploadData = (state, dispatch) => {
  let documents = get(
    state,
    "screenConfiguration.preparedFinalObject.applyScreenMdmsData.FireNoc.Documents",
    []
  );
  documents = documents.filter(item => {
    return item.active;
  });
  let documentsContract = [];
  let tempDoc = {};
  documents.forEach(doc => {
    let card = {};
    card["code"] = doc.documentType;
    card["title"] = doc.documentType;
    card["cards"] = [];
    tempDoc[doc.documentType] = card;
  });

  documents.forEach(doc => {
    // Handle the case for multiple muildings
    if (
      doc.code === "BUILDING.BUILDING_PLAN" &&
      doc.hasMultipleRows &&
      doc.options
    ) {
      let buildingsData = get(
        state,
        "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.buildings",
        []
      );

      buildingsData.forEach(building => {
        let card = {};
        card["name"] = building.name;
        card["code"] = doc.code;
        card["hasSubCards"] = true;
        card["subCards"] = [];
        doc.options.forEach(subDoc => {
          let subCard = {};
          subCard["name"] = subDoc.code;
          subCard["required"] = subDoc.required ? true : false;
          card.subCards.push(subCard);
        });
        tempDoc[doc.documentType].cards.push(card);
      });
    } else {
      let card = {};
      card["name"] = doc.code;
      card["code"] = doc.code;
      card["required"] = doc.required ? true : false;
      if (doc.hasDropdown && doc.dropdownData) {
        let dropdown = {};
        dropdown.label = "NOC_SELECT_DOC_DD_LABEL";
        dropdown.required = true;
        dropdown.menu = doc.dropdownData.filter(item => {
          return item.active;
        });
        dropdown.menu = dropdown.menu.map(item => {
          return { code: item.code, label: getTransformedLocale(item.code) };
        });
        card["dropdown"] = dropdown;
      }
      tempDoc[doc.documentType].cards.push(card);
    }
  });

  Object.keys(tempDoc).forEach(key => {
    documentsContract.push(tempDoc[key]);
  });

  dispatch(prepareFinalObject("documentsContract", documentsContract));
};

export const prepareDocumentsUploadRedux = (state, dispatch) => {
  const {
    documentsList,
    documentsUploadRedux = {},
    prepareFinalObject
  } = this.props;
  let index = 0;
  documentsList.forEach(docType => {
    docType.cards &&
      docType.cards.forEach(card => {
        if (card.subCards) {
          card.subCards.forEach(subCard => {
            let oldDocType = get(
              documentsUploadRedux,
              `[${index}].documentType`
            );
            let oldDocCode = get(
              documentsUploadRedux,
              `[${index}].documentCode`
            );
            let oldDocSubCode = get(
              documentsUploadRedux,
              `[${index}].documentSubCode`
            );
            if (
              oldDocType != docType.code ||
              oldDocCode != card.name ||
              oldDocSubCode != subCard.name
            ) {
              documentsUploadRedux[index] = {
                documentType: docType.code,
                documentCode: card.name,
                documentSubCode: subCard.name
              };
            }
            index++;
          });
        } else {
          let oldDocType = get(documentsUploadRedux, `[${index}].documentType`);
          let oldDocCode = get(documentsUploadRedux, `[${index}].documentCode`);
          if (oldDocType != docType.code || oldDocCode != card.name) {
            documentsUploadRedux[index] = {
              documentType: docType.code,
              documentCode: card.name,
              isDocumentRequired: card.required,
              isDocumentTypeRequired: card.dropdown
                ? card.dropdown.required
                : false
            };
          }
        }
        index++;
      });
  });
  prepareFinalObject("documentsUploadRedux", documentsUploadRedux);
};

export const furnishNocResponse = response => {
  // Handle applicant ownership dependent dropdowns
  let ownershipType = get(
    response,
    "FireNOCs[0].fireNOCDetails.applicantDetails.ownerShipType"
  );
  set(
    response,
    "FireNOCs[0].fireNOCDetails.applicantDetails.ownerShipMajorType",
    ownershipType == undefined ? "SINGLE" : ownershipType.split(".")[0]
  );

  // Prepare UOMS and Usage Type Dropdowns in required format
  let buildings = get(response, "FireNOCs[0].fireNOCDetails.buildings", []);
  buildings.forEach((building, index) => {
    let uoms = get(building, "uoms", []);
    let uomMap = {};
    uoms.forEach(uom => {
      uomMap[uom.code] = `${uom.value}`;
    });
    set(
      response,
      `FireNOCs[0].fireNOCDetails.buildings[${index}].uomsMap`,
      uomMap
    );

    let usageType = get(building, "usageType");
    set(
      response,
      `FireNOCs[0].fireNOCDetails.buildings[${index}].usageTypeMajor`,
      usageType == undefined ? "" : usageType.split(".")[0]
    );
  });

  return response;
};

export const setApplicationNumberBox = (state, dispatch, applicationNo) => {
  if (!applicationNo) {
    applicationNo = get(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.applicationNumber",
      null
    );
  }

  if (applicationNo) {
    dispatch(
      handleField(
        "apply",
        "components.div.children.headerDiv.children.header.children.applicationNumber",
        "visible",
        true
      )
    );
    dispatch(
      handleField(
        "apply",
        "components.div.children.headerDiv.children.header.children.applicationNumber",
        "props.number",
        applicationNo
      )
    );
  }
};

export const downloadReceiptFromFilestoreID=(fileStoreId,mode,tenantId)=>{
  getFileUrlFromAPI(fileStoreId,tenantId).then(async(fileRes) => {
    if (mode === 'download') {
      var win = window.open(fileRes[fileStoreId], '_blank');
      if(win){
        win.focus();
      }
    }
    else {
     // printJS(fileRes[fileStoreId])
      var response =await axios.get(fileRes[fileStoreId], {
        //responseType: "blob",
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf"
        }
      });
      console.log("responseData---",response);
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      var myWindow = window.open(fileURL);
      if (myWindow != undefined) {
        myWindow.addEventListener("load", event => {
          myWindow.focus();
          myWindow.print();
        });
      }

    }
  });
}

let getModifiedPayment = (payments) =>{
  if(payments[0].paymentDetails[0].businessService === 'PT'){
  let tax=0;
  let arrear=0;
  let penalty=0;
  let interest=0
  let rebate=0;
  let roundOff=0;
  let swatchatha=0;
  //let currentDate=convertDateToEpoch(new Date());  
  let currentDate = payments[0].transactionDate;

  payments[0].paymentDetails[0].bill.billDetails.forEach(billdetail =>{
    if(billdetail.amount!==0)
    {
    if(billdetail.fromPeriod<= currentDate && billdetail.toPeriod >= currentDate){
      billdetail.billAccountDetails.forEach(billAccountDetail =>{
        switch (billAccountDetail.taxHeadCode) {
          case "PT_TAX":
            tax = Math.round((tax+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_LATE_ASSESSMENT_PENALTY":
            penalty = Math.round((penalty+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_TIME_REBATE":
            rebate = Math.round((rebate+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_ROUNDOFF":
            roundOff = Math.round((roundOff+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_TIME_INTEREST":
            interest = Math.round((interest+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_PROMOTIONAL_REBATE":
            rebate = Math.round((rebate+(billAccountDetail.amount))*100)/100;
            break;
          case "SWATCHATHA_TAX":
            swatchatha = Math.round((swatchatha+(billAccountDetail.amount))*100)/100;
            break;
          default:
            break;
        }
      })
      // tax = tax-Math.abs(rebate);
    }else if(!(billdetail.fromPeriod > currentDate && billdetail.toPeriod > currentDate)){
      billdetail.billAccountDetails.forEach(billAccountDetail =>{
        switch (billAccountDetail.taxHeadCode) {
          case "PT_TAX":
            arrear = Math.round((arrear+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_LATE_ASSESSMENT_PENALTY":
            penalty = Math.round((penalty+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_TIME_REBATE":
            rebate = Math.round((rebate+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_ROUNDOFF":
            roundOff = Math.round((roundOff+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_TIME_INTEREST":
            interest = Math.round((interest+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_PROMOTIONAL_REBATE":
            rebate = Math.round((rebate+(billAccountDetail.amount))*100)/100;
            break;
          case "SWATCHATHA_TAX":
            swatchatha = Math.round((swatchatha+(billAccountDetail.amount))*100)/100;
            break;
          default:
            break;
        }
      })
    }
  }
  })
  let totalAmount =   get(payments, `[0].paymentDetails[0].bill.totalAmount`,null);
  set(payments, `[0].paymentDetails[0].bill.totalAmount`, totalAmount.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.tax`, tax.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.arrear`, arrear.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.penalty`, penalty);
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.swatchatha`, swatchatha.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.rebate`, rebate.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.interest`, interest.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.roundOff`, roundOff);
}
  else if(payments[0].paymentDetails[0].businessService === 'PT.MUTATION'){ 
  let ptMutationFee=0;
  let ptMutationLateFee=0;
  let ptMutationApplicationFee=0;
  let ptMutationProcessingFee=0;
  let ptMutationPublicationFee=0
  let currentDate = payments[0].transactionDate;
  payments[0].paymentDetails[0].bill.billDetails.forEach(billdetail =>{
    if(billdetail.amount!==0)
    {
    if(billdetail.fromPeriod<= currentDate && billdetail.toPeriod >= currentDate){
      billdetail.billAccountDetails.forEach(billAccountDetail =>{
        switch (billAccountDetail.taxHeadCode) {
          case "PT_MUTATION_FEE":
          ptMutationFee = Math.round((ptMutationFee+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_MUTATION_LATE_FEE":
          ptMutationLateFee = Math.round((ptMutationLateFee+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_MUTATION_APPLICATION_FEE":
          ptMutationApplicationFee = Math.round((ptMutationApplicationFee+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_MUTATION_PROCESSING_FEE":
          ptMutationProcessingFee = Math.round((ptMutationProcessingFee+(billAccountDetail.amount))*100)/100;
            break;
          case "PT_MUTATION_PUBLICATION_FEE":
          ptMutationPublicationFee = Math.round((ptMutationPublicationFee+(billAccountDetail.amount))*100)/100;
            break;      
          default:
            break;
        }
      })
    }
  }
  })
  let totalAmount =   get(payments, `[0].paymentDetails[0].bill.totalAmount`,null);
  set(payments, `[0].paymentDetails[0].bill.totalAmount`, totalAmount.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.ptMutationFee`, ptMutationFee.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.ptMutationLateFee`, ptMutationLateFee.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.ptMutationApplicationFee`, ptMutationApplicationFee.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.ptMutationProcessingFee`, ptMutationProcessingFee.toFixed(2));
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.ptMutationPublicationFee`, ptMutationPublicationFee.toFixed(2));
}
else if(payments[0].paymentDetails[0].businessService === 'TL'){
  let tax=0;
  let adhocPenalty=0;
  let penalty=0;
  let adhocRebate=0
  let rebate=0;
  payments[0].paymentDetails[0].bill.billDetails.forEach(billdetail =>{
      billdetail.billAccountDetails.forEach(billAccountDetail =>{
        switch (billAccountDetail.taxHeadCode) {
          case "TL_TAX":
            tax = Math.round((tax + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_ADHOC_REBATE":
            adhocRebate =
              Math.round((adhocRebate + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_TIME_PENALTY":
            penalty =
              Math.round((penalty + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_TIME_REBATE":
            rebate =
              Math.round((rebate + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_ADHOC_PENALTY":
            adhocPenalty =
              Math.round((adhocPenalty + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_RENEWAL_TAX":
            tax =
              Math.round((tax + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_RENEWAL_REBATE":
            rebate =
              Math.round((rebate + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_RENEWAL_PENALTY":
            penalty =
              Math.round((penalty + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_RENEWAL_ADHOC_REBATE":
            adhocRebate =
              Math.round((adhocRebate + billAccountDetail.amount) * 100) / 100;
            break;
          case "TL_RENEWAL_ADHOC_PENALTY":
            adhocPenalty =
              Math.round((adhocPenalty + billAccountDetail.amount) * 100) / 100;
            break;
          default:
            break;
        }
      })
    })
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.tax`, tax);
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.adhocRebate`, adhocRebate);
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.penalty`, penalty);
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.adhocPenalty`, adhocPenalty);
  set(payments, `[0].paymentDetails[0].bill.additionalDetails.rebate`, rebate);
}

set(payments, `[0].paymentDetails[0].bill.additionalDetails.financialYear`, getFinancialYearFromEPOCH(payments[0].transactionDate));
return payments;
}

const getBankname = async(payment) =>{
  const ifscCode = payment[0] &&  payment[0].ifscCode && payment[0].ifscCode;
  let payload;
  if (ifscCode) {
    payload = await axios.get(`https://ifsc.razorpay.com/${ifscCode}`);
    console.log("===================>",payload);
    if (payload.data === "Not Found") {
      set(payment, `[0].bankName`, "");
      set(payment, `[0].branchName`, "");
    } else {
      const bankName = get(payload.data, "BANK");
      const bankBranch = get(payload.data, "BRANCH");
      set(payment, `[0].bankName`, bankName);
      set(payment, `[0].branchName`, bankBranch);
    }
  }
  return payment;
}
export const download = (receiptQueryString, mode = "download") => {
  const FETCHRECEIPT = {
    GET: {
      URL: "/collection-services/payments/_search",
      ACTION: "_get",
    },
  };
  const DOWNLOADRECEIPT = {
    GET: {
      URL: "/pdf-service/v1/_create",
      ACTION: "_get",
    },
  };
  try {
    httpRequest("post", FETCHRECEIPT.GET.URL, FETCHRECEIPT.GET.ACTION, receiptQueryString).then(async(payloadReceiptDetails) => {
      let queryStr = {};
      payloadReceiptDetails.Payments = await getBankname(payloadReceiptDetails.Payments);
      payloadReceiptDetails.Payments = getModifiedPayment(payloadReceiptDetails.Payments);
      if (payloadReceiptDetails.Payments[0].paymentDetails[0].businessService === 'PT') {
        queryStr = [
          { key: "key", value: "consolidatedreceipt" },
          { key: "tenantId", value: receiptQueryString[1].value.split('.')[0] }
        ]
      }
      else   if (payloadReceiptDetails.Payments[0].paymentDetails[0].businessService === 'PT.MUTATION') {
        queryStr = [
          { key: "key", value: "pt-mutation-reciept" },
          { key: "tenantId", value: receiptQueryString[1].value.split('.')[0] }
        ]
      }
      else if (payloadReceiptDetails.Payments[0].paymentDetails[0].businessService === 'TL') {
        queryStr = [
          { key: "key", value: "tl-receipt" },
          { key: "tenantId", value: receiptQueryString[1].value.split('.')[0] }
        ]
      }
      else {
        queryStr = [
          { key: "key", value: "misc-receipt" },
          { key: "tenantId", value: receiptQueryString[1].value.split('.')[0] }
        ]
      }
      if(payloadReceiptDetails&&payloadReceiptDetails.Payments&&payloadReceiptDetails.Payments.length==0){
        console.log("Could not find any receipts");
        return;
      }
      httpRequest("post", DOWNLOADRECEIPT.GET.URL, DOWNLOADRECEIPT.GET.ACTION, queryStr, { Payments: payloadReceiptDetails.Payments }, { 'Accept': 'application/json' }, { responseType: 'arraybuffer' })
        .then(res => {
          res.filestoreIds[0]
          if(res&&res.filestoreIds&&res.filestoreIds.length>0){
            res.filestoreIds.map(fileStoreId=>{
              downloadReceiptFromFilestoreID(fileStoreId,mode)
            })
          }else{
            console.log("Error In Receipt Download");
          }
        });
    })
  } catch (exception) {
    alert('Some Error Occured while downloading Receipt!');
  }
}


export const downloadBill = async (consumerCode ,tenantId) => {
  const searchCriteria = {
    consumerCode ,
    tenantId
  }
  const FETCHBILL={
    GET:{
      URL:"egov-searcher/bill-genie/billswithaddranduser/_get",
      ACTION: "_get",
    }
  }
  const DOWNLOADRECEIPT = {
      GET: {
          URL: "/pdf-service/v1/_create",
          ACTION: "_get",
      },
  };
  const billResponse = await httpRequest("post", FETCHBILL.GET.URL, FETCHBILL.GET.ACTION, [],{searchCriteria});
  const queryStr = [
            { key: "key", value: "consolidatedbill" },
            { key: "tenantId", value: "pb" }
        ]
  const pfResponse = await httpRequest("post", DOWNLOADRECEIPT.GET.URL, DOWNLOADRECEIPT.GET.ACTION, queryStr, { Bill: billResponse.Bills }, { 'Accept': 'application/pdf' }, { responseType: 'arraybuffer' })
  downloadReceiptFromFilestoreID(pfResponse.filestoreIds[0],'download');
}

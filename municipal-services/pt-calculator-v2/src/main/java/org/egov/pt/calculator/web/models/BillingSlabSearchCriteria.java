package org.egov.pt.calculator.web.models;

import java.util.List;

import javax.validation.constraints.NotNull;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BillingSlabSearchCriteria {

	@JsonProperty("tenantId")
	@NotNull
	public String tenantId;
	
	@JsonProperty("id")
	public List<String> id;
	
	@JsonProperty("propertyType")
	public String propertyType;
	
	@JsonProperty("ward")
	private String ward;

	@JsonProperty("mohalla")
	private String mohalla;

	@JsonProperty("roadtype")
	private String roadType;
	
}

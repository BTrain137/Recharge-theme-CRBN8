ReCharge.Bundle = {
  Utils: {
    // Utility functions used throughout the rest of the build
    dateToString: function (item) {
      // Outputs a ReCharge date to a readable string
      // 1.) item = ReCharge generated date
      var date = new Date(item);
      var year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(
        date
      );
      var month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
      var day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
      return `${month} ${day}, ${year}`;
    },
    toCurrency: function (item) {
      // Outputs a number into currency format
      // 1.) item = a number variable
      return item.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    },
    capitalize: function (item) {
      // Capitalizes a word string
      // 1.) item = string to be capitalized
      return item.charAt(0).toUpperCase() + item.slice(1);
    },
    isBundleItem: function (item) {
      // Boolean function to determine if item
      // contains a bundle_id line item property
      // 1.) item = product object containing a properties key
      for (var i = 0; i < item.properties.length; i++) {
        var property = item.properties[i];
        if ("name" in property && property["name"] == "bundle_id") {
          return true;
        }
      }
      return false;
    },
    hasBundleId: function (item, bundle_id) {
      // Boolean function to determine if item contains
      // specified bundle_id in its line item properties
      // 1.) item = product object containing a properties key
      // 2.) bundle_id = bundle id string to compare against
      for (var i = 0; i < item.properties.length; i++) {
        var property = item.properties[i];
        if (
          "name" in property &&
          property["name"] == "bundle_id" &&
          "value" in property &&
          property["value"] == bundle_id
        ) {
          return true;
        }
      }
      return false;
    },
    hasNonBundleSubscription: function (items) {
      // Boolean function to determine if item does
      // not contain a bundle_id line item property
      // 1.) item = product object containing a properties key
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        for (var j = 0; j < item.properties.length; j++) {
          var property = item.properties[i];
          if ("name" in property && property["name"] == "bundle_id") {
            return false;
          }
        }
        return true;
      }
    },
  },
  Lists: {
    findBundleIds: function (addresses) {
      // Creates object of address / bundle_id list pairs
      // to be used when outputting bundle tables
      // 1.) addresses = list of ReCharge address objects
      // address_id is key, and value is array of bundle_ids
      var bundles = {};
      // Loop through addresses
      for (var i = 0; i < addresses.length; i++) {
        var address = addresses[i];
        var bundle_ids = [];
        // Loop through subscriptions
        for (var j = 0; j < address.subscriptions.length; j++) {
          var subscription = address.subscriptions[j];
          // Loop through subscription's line item properties
          for (var k = 0; k < subscription.properties.length; k++) {
            var property = subscription.properties[k];
            // If line item property is a bundle_id,
            // add the value to the bundle_id list
            if ("name" in property && property["name"] == "bundle_id") {
              bundle_ids.push(property["value"]);
            }
          }
        }
        // If there are bundle_ids for this address,
        // add address to bundles object and set
        // duplicate-removed list of bundle_ids as value
        if (bundle_ids.length > 0) {
          bundles[address.id] = Array.from(new Set(bundle_ids));
        }
      }
      return bundles;
    },
    findCancelledAddresses: function (addresses) {
      // Creates array of addresses containing a
      // subscription with status = CANCELLED
      // 1.) addresses = list of ReCharge address objects
      var cancelled = [];
      for (var i = 0; i < addresses.length; i++) {
        var address = addresses[i];
        for (var j = 0; j < address.subscriptions.length; j++) {
          var subscription = address.subscriptions[j];
          if (subscription.status == "CANCELLED") {
            cancelled.push(address);
            break;
          }
        }
      }
      return cancelled;
    },
  },
  Html: {
    addressHeader: function (address) {
      // Outputs address header section of each address
      // 1.) address = ReCharge address object
      return `
        <h4>${address.first_name} ${address.last_name}</h4>
        <p>
          <strong>Ships to:</strong> 
          ${address.address1} ${address.address2} ${address.city} 
          ${address.province} ${address.zip}
          <a href="${ReCharge.Endpoints.show_address_url(address.id)}">Edit</a> 
        </p>`;
    },
    pageFooter: function () {
      // Outputs Add Product and Add Address buttons
      return `
        <p>
          <a href="${ReCharge.Endpoints.product_search_url()}" 
             class="btn"
          >
            Add product
          </a> 
          <a href="${ReCharge.Endpoints.create_address_url()}" 
             class="btn btn--secondary"
          >
            Add address
          </a> 
        </p> `;
    },
    bundleTable: function (address_id, items, bundle_ids) {
      // Outputs bundle table for given address
      // 1.) address_id = id of ReCharge address object
      // 2.) items = ReCharge subscriptions array belonging to an address
      // 3.) bundle_ids = list of bundle_ids present in the address
      var output = "";
      // Loop through list of bundle_ids
      for (var i = 0; i < bundle_ids.length; i++) {
        var bundle_id = bundle_ids[i];
        var rows = "";
        var subscription_ids = [];
        // Loop through list of subscriptions
        for (var j = 0; j < items.length; j++) {
          var item = items[j];
          // Only process subscription if it is ACTIVE and it contains a bundle_id line item property
          if (
            item.status != "CANCELLED" &&
            ReCharge.Bundle.Utils.hasBundleId(item, bundle_id)
          ) {
            // Generate table row HTML
            var img =
              item.product && item.product.images && item.product.images.small
                ? '<img src="' + item.product.images["small"] + '"><br>'
                : '<img src="//rechargestatic-bootstrapheroes.netdna-ssl.com/static/images/no-image.png" width="100"><br>';
            var variant_title = item.variant_title
              ? "(" + item.variant_title + ")"
              : "";
            var next_charge = !item.next_charge_scheduled_at
              ? "Error"
              : ReCharge.Bundle.Utils.dateToString(
                  item.next_charge_scheduled_at
                );
            var swap_link = item.is_swappable
              ? `<a href="${ReCharge.Endpoints.subscription_swap_search_url(
                  item.id
                )}">
                Swap
               </a><br>`
              : "";
            subscription_ids.push(item.id);
            rows += `
              <tr> 
                <td>${img} ${item.product_title} ${variant_title}</td>
                <td>${item.quantity}</td> 
                <td>${ReCharge.Bundle.Utils.toCurrency(item.price)}</td> 
                <td>
                  ${
                    item.order_interval_frequency
                  } ${ReCharge.Bundle.Utils.capitalize(
              item.order_interval_unit
            )}s
                </td> 
                <td>${next_charge}</td>
              </tr> `;
          }
        }
        // Generate the table header. This will output the bundle_id and
        // a button to update the next shipment date for each bundle item
        var header = `
          <div class="bundle-header"> 
            <h5>Bundle: ${bundle_id}</h5>
            <a href="#" onclick="ReCharge.Helpers.toggle('bundleUpdate_NextChargeDate_${bundle_id}');return false;" class="btn">
              Update Next Shipment
            </a>
          </div>
          <form method="post" 
                name="ReChargeForm_bundleUpdateNextChargeDate"
                id="bundleUpdate_NextChargeDate_${bundle_id}" 
                style="display: none;"
          > 
            <input type="hidden" 
                   name="redirect_url"
                   value="${ReCharge.Endpoints.list_subscriptions_url()}"> 
            <fieldset>
              <input type="hidden" name="address-id"" value="${address_id}">
              <input type="hidden" name="subscription-ids" value="${subscription_ids.join(
                ","
              )}">
              <label for="date">Date</label>
              <input type="date" name="date"">
              <button type="submit" class="btn">Submit</button>
            </fieldset>
          </form>`;
        // Put all parts together to return the full bundle table HTML
        output += `
          ${header}
          <div class="table-wrap"> 
            <div class="table-wrapper">
              <table class="full"> 
                <thead>
                  <tr>
                    <th>Bundle</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Next Order</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows} 
                </tbody>
              </table>
            </div>
          </div> `;
      }
      return output;
    },
    subscriptionTable: function (items) {
      // Outputs subscriptions table for given address
      // 1.) items = ReCharge subscriptions array belonging to an address
      var rows = "";
      // Loop through list of subscriptions
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        // Only process subscription if it is ACTIVE and it does not contain a bundle_id line item property
        if (
          item.status != "CANCELLED" &&
          !ReCharge.Bundle.Utils.isBundleItem(item)
        ) {
          // Generate table row HTML
          var img =
            item.product && item.product.images && item.product.images.small
              ? '<img src="' + item.product.images["small"] + '"><br>'
              : '<img src="//rechargestatic-bootstrapheroes.netdna-ssl.com/static/images/no-image.png" width="100"><br>';
          var variant_title = item.variant_title
            ? "(" + item.variant_title + ")"
            : "";
          var next_charge = !item.next_charge_scheduled_at
            ? "Error"
            : ReCharge.Bundle.Utils.dateToString(item.next_charge_scheduled_at);
          var swap_link = item.is_swappable
            ? `<a href="${ReCharge.Endpoints.subscription_swap_search_url(
                item.id
              )}">Swap</a><br>`
            : "";
          rows += `
            <tr>
              <td>${img} ${item.product_title} ${variant_title}</td> 
              <td>${item.quantity}</td> 
              <td>${ReCharge.Bundle.Utils.toCurrency(item.price)}</td> 
              <td>
                ${item.order_interval_frequency} 
                ${ReCharge.Bundle.Utils.capitalize(item.order_interval_unit)}s
              </td> 
              <td>${next_charge}</td>
              <td>
                <a href="${ReCharge.Endpoints.show_subscription_url(
                  item.id
                )}">Edit</a>
                <br> ${swap_link}
                <a href="${ReCharge.Endpoints.cancel_subscription_url(
                  item.id
                )}">Cancel</a>
                <br>
              </td> 
            </tr>`;
        }
      }
      // Put all parts together to return the full bundle table HTML
      var table = `
        <div class="table-wrap"> 
          <div class="table-wrapper">
            <table class="full"> 
              <thead>
                <tr>
                  <th>Subscriptions</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Next Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>`;
      return table;
    },
    onetimeTable: function (items) {
      // Outputs one-time items table for given address
      // 1.) items = ReCharge one-time items array belonging to an address
      var rows = "";
      // Loop through list of one-time items
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        // Only process one-time item if it is ACTIVE
        if (item.status != "CANCELLED") {
          // Generate table row HTML
          var img =
            item.product && item.product.shopify_details.images
              ? '<img src="' + item.product.images["small"] + '"><br>'
              : '<img src="//rechargestatic-bootstrapheroes.netdna-ssl.com/static/images/no-image.png" width="100"><br>';
          var variant_title = item.variant_title ? item.variant_title : "";
          rows += `
            <tr>
              <td>${img} ${item.product_title} ${variant_title}</td> 
              <td>${item.quantity}</td> 
              <td>${ReCharge.Bundle.Utils.toCurrency(item.price)}</td>
              <td>One-time</td> 
              <td>${ReCharge.Bundle.Utils.dateToString(
                item.next_charge_scheduled_at
              )}</td> 
              <td> 
                <a href="${ReCharge.Endpoints.show_onetime_url(
                  item.id
                )}">Edit</a><br>
                <a href="#" 
                  onclick="if (window.confirm('Are you sure you want to cancel this  product?')) { ReCharge.Onetime.cancel(${
                    item.id
                  }); }; return false;"
                >
                  Cancel
                </a><br>
              </td>
            </tr>`;
        }
      }
      // Put all parts together to return the full bundle table HTML
      var table = `
        <div class="table-wrap"> 
          <div class="table-wrapper">
            <table class="full"> 
              <thead>
                <tr> 
                <th>One-times</th> 
                <th>Quantity</th> 
                <th>Amount</th> 
                <th>Frequency</th> 
                <th>Next Order</th> 
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>`;
      return table;
    },
    discountForm: function (address) {
      // Outputs discount info to be able to add or remove a discount
      // 1.) address = ReCharge address object
      // If discount already exists on address,
      // show link to remove discount
      if (address.discount_id) {
        return `
          <p>
            Applied discount: ${address.discount.code}<br>
            <a href="#" 
               onclick="ReCharge.Discount.remove(${address.id}, ${address.discount_id});return false;" 
               class="btn"
            >
              Remove discount
            </a> 
          </p>`;
      }
      // If discount doesn't exist on address,
      // show link to add discount
      else {
        return ` 
          <p>
            <a href="#" 
              onclick="ReCharge.Helpers.toggle('ReChargeForm_applyDiscount_${
                address.id
              }');return false;" 
              class="btn"
            >
              Add discount
            </a>
          </p>
          <form method="post" 
               
                id="ReChargeForm_applyDiscount_${address.id}" 
                style="display: none;"
          >
            <input type="hidden" name="redirect_url" value="${ReCharge.Endpoints.list_subscriptions_url()}" />
            <fieldset>
              <label for="discount_code">Discount code</label>
              <input type="text" name="discount_code" id="discount_code" placeholder="Enter discount" />
              <button type="submit" class="btn">Apply</button> 
            </fieldset>
          </form>`;
      }
    },
    cancelledSubscriptionTable: function (items) {
      // Outputs cancelled subscriptions table for given address
      // 1.) items = ReCharge subscriptions array belonging to an address
      var rows = "";
      // Loop through list of cancelled subscriptions
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        // Only process subscription if it is CANCELLED
        if (item.status == "CANCELLED") {
          // Generate table row HTML
          var img =
            item.product && item.product.images && item.product.images.small
              ? '<img src="' + item.product.images["small"] + '"><br>'
              : '<img src="//rechargestatic-bootstrapheroes.netdna-ssl.com/static/images/no-image.png" width="100"><br>';
          var variant_title = item.variant_title ? item.variant_title : "";
          var next_charge = !item.next_charge_scheduled_at
            ? "Error"
            : ReCharge.Bundle.Utils.dateToString(item.next_charge_scheduled_at);
          rows += `
            <tr>
              <td>
                ${img} ${item.product_title} ${variant_title}
              </td>
              <td>${item.quantity}</td>
              <td>${ReCharge.Bundle.Utils.toCurrency(item.price)}</td>
              <td>
                ${item.order_interval_frequency}$
                {ReCharge.Bundle.Utils.capitalize(item.order_interval_unit)}s
              </td>
              <td>Cancelled</td>
              <td>
                <a
                  href="#"
                  onclick="ReCharge.Subscription.activate(${
                    item.id
                  }); return false;"
                >
                  Re-activate
                </a>
              </td>
            </tr>`;
        }
      }
      // Put all parts together to return the full bundle table HTML
      var table = `
        <div class="table-wrap"> 
          <div class="table-wrapper">
            <table class="full"> 
              <thead>
                <tr>
                  <th>Subscriptions</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Next Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>`;
      return table;
    },
  },
};

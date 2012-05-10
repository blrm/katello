/**
 Copyright 2011 Red Hat, Inc.

 This software is licensed to you under the GNU General Public
 License as published by the Free Software Foundation; either version
 2 of the License (GPLv2) or (at your option) any later version.
 There is NO WARRANTY for this software, express or implied,
 including the implied warranties of MERCHANTABILITY,
 NON-INFRINGEMENT, or FITNESS FOR A PARTICULAR PURPOSE. You should
 have received a copy of GPLv2 along with this software; if not, see
 http://www.gnu.org/licenses/old-licenses/gpl-2.0.txt.
*/


KT.panel.list.registerPage('system_groups', { create : 'new_system_group' });

$(document).ready(function() {
    KT.panel.set_expand_cb(function(){
        KT.system_groups.new_setup();
        KT.system_groups.details_setup();
        KT.system_groups.systems_setup();
    });
});


KT.sg_table = (function(){
    var add_system = function(html){
        var tbody =  $("#systems_table").find("tbody");
        tbody.prepend(html);
        tbody.find(".empty_row").hide();

    },
    remove_system = function(id){
        var table = $("#systems_table"),
            rows;
        table.find("tr[data-id=" + id +"]").remove();
        rows = table.find('tbody').find('tr').not('.empty_row');
        if(rows.length === 0){
            table.find(".empty_row").show();
        }
    };

    return {
        add_system: add_system,
        remove_system: remove_system
    };
}());

KT.system_groups = (function(){
    var current_system_input,
        current_max_systems = undefined,
    lockedChanged = function(){
        var checkbox = $(this),
        name = $(this).attr("name"),
        options = {};
        if (checkbox.attr("checked") !== undefined) {
            options[name] = true;
        } else {
            options[name] = false;
        }
        $.ajax({
            type: "POST",
            url: checkbox.attr("data-url"),
            data: options,
            cache: false
        });
        return false;
    },
    quota_setup = function() {
        // quota_setup is used for both the 'new' and 'edit' panes.  While the logic is nearly the same
        // there are slight differences, since the 'edit' uses inline editing, but the 'new' does not.
        var unlimited = '-1',
            initial_max = undefined;

        if ($('system_group_new').length > 0) {
            // user is creating a group
            initial_max = $('#system_group_max_systems').val();
        } else {
            // user is editing a group
            initial_max = $('#system_group_max_systems').html();
        }
        current_max_systems = initial_max.length === 0 ? unlimited : initial_max;

        $('input.unlimited_members').unbind('click');
        $('input.unlimited_members').bind('click', function(){
            var max_systems_element = $('.limit'),
                max_systems = $('#system_group_max_systems');

            if($(this).is(":checked")){
                // user checked unlimited
                max_systems_element.hide();
                max_systems.val(unlimited);

                if (max_systems.hasClass('editable')) {
                    // user is editing an existing group
                    if (max_systems.val() !== current_max_systems) {
                        // user has changed the value since toggling unlimited on/off/on, so send request to server to set max_systems to unlimited
                        $.ajax({
                            type: "PUT",
                            url: max_systems.data("url"),
                            data: {system_group:{max_systems:unlimited}},
                            cache: false,
                            success: function(data) {
                                max_systems.html(i18n.clickToEdit); // reset the jeditable input
                                current_max_systems = unlimited;
                            },
                            error: function() {
                            }
                        });
                    }
                }
            } else {
                // user unchecked unlimited
                max_systems.val('');
                max_systems_element.show();

                if (max_systems.hasClass('editable')) {
                    // user is editing an existing group, send a click event to jeditable to open, so the user doesn't need to
                    max_systems.click();
                }
            }
        });
    },
    new_setup = function(){
        var pane = $("#system_group_new");
        if (pane.length === 0){
            return;
        }
        quota_setup();
    },
    details_setup = function(){
        var pane = $("#system_group_edit");
        if (pane.length === 0){
            return;
        }
        pane.find('#system_group_locked').bind('change', KT.system_groups.lockedChanged);
        pane.find(".edit_name").each(function(){
            $(this).editable($(this).data("url"), {
                type        :  'text',
                width       :  250,
                method      :  'PUT',
                name        :  $(this).attr('name'),
                cancel      :  i18n.cancel,
                submit      :  i18n.save,
                indicator   :  i18n.saving,
                tooltip     :  i18n.clickToEdit,
                placeholder :  i18n.clickToEdit,
                submitdata  :  $.extend({ authenticity_token: AUTH_TOKEN }, KT.common.getSearchParams()),
                onsuccess   :  function(data){
                    var id = $('#system_group_id');
                    list.refresh(id.val(), id.data('ajax_url'))
                }
            });
        });
        pane.find(".edit_max_systems").each(function(){
            $(this).editable($(this).data("url"), {
                type        :  'text',
                width       :  250,
                method      :  'PUT',
                name        :  $(this).attr('name'),
                cancel      :  i18n.cancel,
                submit      :  i18n.save,
                indicator   :  i18n.saving,
                tooltip     :  i18n.clickToEdit,
                placeholder :  i18n.clickToEdit,
                submitdata  :  $.extend({ authenticity_token: AUTH_TOKEN }, KT.common.getSearchParams()),
                onsuccess   :  function(data){
                    $(this).html(data);
                    current_max_systems = data;
                },
                onresetcomplete :  function(settings, element){
                    // This event is invoked on cancel, esc and click outside of the element.
                    // When this occurs, if the user hasn't changed the value, reset to 'unlimited', hiding
                    // the limit element.
                    if ($(element).html() === i18n.clickToEdit) {
                        $('.limit').hide();
                        $('input.unlimited_members').attr('checked', 'checked');
                    }
                }
            });
        });
        quota_setup();
    },
    systems_setup = function(){
        var pane = $("#system_group_systems");
        if (pane.length === 0){
            return;
        }
        pane.find('#systems_table').delegate('.remove_system', 'click', function(){
            remove_system($(this).data('id'), $(this));
        });
        current_system_input = KT.auto_complete_box({
            values:       KT.routes.auto_complete_systems_path(),
            input_id:     "add_system_input",
            form_id:      "system_form",
            add_btn_id:   "add_system",
            selected_input_id: 'add_system_input_id',
            add_cb:       add_system
        });
    },
    add_system = function(string, item_id, cb){
        var grp_id = $("#system_group_systems").data('id'),
        add_funct = function(id){
            if(id){
                submit_change(grp_id, id, true, function(content){
                    KT.sg_table.add_system(content);
                    $("#add_system_input").val('');
                    cb();
                });
            }
            else {
                current_system_input.error();
                cb();
            }
        };
        if (item_id) {
            add_funct(item_id);
        }
        else {
            //User did not select from the list, so we must search
            $.get(KT.routes.auto_complete_systems_path(), {term:string}, function(data){
                var found = false;
                $.each(data, function(index, element){
                    console.log(element.label);
                    if (element.label === string){
                        found = element.id;

                        return false;
                    }
                });
                add_funct(found);
            });
        }

    },
    remove_system = function(id, link){
        var grp_id = $("#system_group_systems").data('id');
        link.replaceWith('<img class="remove_spinner fr" src="' + KT.common.spinner_path() + '">');
        submit_change(grp_id, id, false,
            function(){KT.sg_table.remove_system(id);});
    },
    submit_change = function(grp_id, sys_id, add, cb){
      var url = add ? KT.routes.add_systems_system_group_path(grp_id) :
                        KT.routes.remove_systems_system_group_path(grp_id);
      $.post(url, {'system_ids':[sys_id]}, cb);
    };

    return {
        lockedChanged: lockedChanged,
        new_setup: new_setup,
        details_setup: details_setup,
        systems_setup: systems_setup,
        add_system : add_system
    }
})();

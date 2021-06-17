# https://github.com/heybourn/headwind/blob/master/package.json#L5016
import sublime, sublime_plugin
import json, os, platform, re, sys
from itertools import chain

PROJECT_NAME = "tailwindcss-Class-Sorter"
SETTINGS_FILE = PROJECT_NAME + ".sublime-settings"
KEYMAP_FILE = "Default ($PLATFORM).sublime-keymap"

IS_WINDOWS = platform.system() == "Windows"


class SortTailwindcssCommand(sublime_plugin.TextCommand):
  def run(self, edit):
    try:
      extension = os.path.splitext(self.view.file_name())[1][1:]

      # .sublime-project
      region_regex = PluginUtils.get_pref(["extensions_regex", extension, "region"], self.view)
      class_regex = PluginUtils.get_pref(["extensions_regex", extension, "class"], self.view)
      conditional_string = PluginUtils.get_pref(["extensions_regex", extension, "conditional"], self.view)
      separator_string = PluginUtils.get_pref(["extensions_regex", extension, "separator"], self.view)

      # .sublime-settings
      region_regex = region_regex.get(extension).get("region") if isinstance(region_regex, dict) else region_regex
      class_regex = class_regex.get(extension).get("class") if isinstance(class_regex, dict) else class_regex
      conditional_string = (
        conditional_string.get(extension).get("conditional")
        if isinstance(conditional_string, dict)
        else conditional_string
      )
      separator_string = (
        separator_string.get(extension).get("separator") if isinstance(separator_string, dict) else separator_string
      )
      separator_string = separator_string if separator_string is not None else " "

      # Get order_type and apply "edit_order"
      [order_list, order_group_name_list] = PluginUtils.get_order(self.view)
      placement = PluginUtils.get_pref(["non_tailwindcss_placement"], self.view)

      # Get variant order and breakpoint order
      variant_ordering = PluginUtils.get_pref(["variant_ordering"], self.view)
      breakpoint_order = PluginUtils.get_pref(["breakpoint_order"], self.view)
      breakpoint_grouping = PluginUtils.get_pref(["breakpoint_grouping"], self.view)
      breakpoint_multiplier = 1000 if breakpoint_grouping == "breakpoint" else 0.00001

      # Get regions and regions' length
      region_list = self.view.find_all(region_regex)
      region_offset = 0

      # Default regex
      re_class_regex = re.compile(class_regex)
      re_string_start = re.compile("[\w\-\!]")
      re_template_class = re.compile("([\"'`][\w\d\s\_\:\/\.\-]*[\"'`])")
      re_tw_variant = re.compile(":[a-zA-Z!-]")

      # Special cases
      special_cases = {
        "position_style": {
          "classes": ["static", "absolute", "relative", "fixed", "sticky"],
          "index": [],
          "min": None,
        },
        "display_style": {
          "classes": ["hidden", "inline", "block", "flex", "grid", "table", "contents", "flow", "list"],
          "index": [],
          "min": None,
        },
      }

      special_cases["position_style"]["index"] = list(
        map(lambda x: order_group_name_list.index(x), special_cases["position_style"]["classes"])
      )
      special_cases["position_style"]["min"] = min(*special_cases["position_style"]["index"])

      special_cases["display_style"]["index"] = list(
        map(lambda x: order_group_name_list.index(x), special_cases["display_style"]["classes"])
      )
      special_cases["display_style"]["min"] = min(*special_cases["display_style"]["index"])

      for region_item in region_list:
        region_size = region_item.size()

        # Reset region begin and end if region offset is not 0
        region = (
          region_item
          if region_offset == 0
          else sublime.Region(region_item.begin() + region_offset, region_item.end() + region_offset)
        )

        region_string = self.view.substr(region)
        class_list = re_class_regex.findall(region_string)

        # Setup container for class groups
        class_list_grouped = list(map(lambda x: [x, []], order_group_name_list))
        class_list_others = None
        class_list_result = ""

        # Group class_names together and get group order weight
        for class_name in class_list:
          class_name_group_order_sort = class_name

          # find dynamic class_name (if/else) by templating engine
          if re_string_start.match(class_name) is None:  # if string doesn't start with [\w\-\!]
            res = class_name.split(conditional_string)[1]
            res = re_template_class.findall(res)
            for item in res:
              if len(item[1:-1]) > 0:
                class_name_group_order_sort = item[1:-1]
                break

          # removes variants
          if re_tw_variant.search(class_name_group_order_sort):
            class_name_group_order_sort = class_name_group_order_sort.split(":")[-1]

          # removes "!" for class_list starting with "!"
          class_name_group_order_sort = self.cleanup(class_name_group_order_sort, ["!"])

          # removes ["!", "-", "no-", "not-", "min-", "max-", "auto-"]
          group_name = self.cleanup(class_name_group_order_sort, ["!", "-", "no-", "not-", "min-", "max-", "auto-"])

          # get group_name
          group_name = group_name.split("-")[0]

          matched_data = {
            "group_name_index": None,  # 1
            "group_order_weight": None,  # 0.001
            "breakpoint_order_weight": None,  # 1000 if (breakpoint_grouping == "breakpoint") else 0.00001
          }
          if group_name in order_group_name_list:
            group_name_index_list = list(
              filter(lambda x: order_group_name_list[x] == group_name, range(len(order_group_name_list)))
            )

            for group_name_index_list_index, group_name_index in enumerate(group_name_index_list):
              # Get group_name_index & group_order_weight
              for regex_index, regex in enumerate(order_list[group_name_index][1]):
                match = re.match(f"^{regex}$", class_name_group_order_sort)

                if match is not None:
                  if special_cases["position_style"]["index"].count(group_name_index) > 0:
                    matched_data["group_name_index"] = special_cases["position_style"]["min"]
                  elif special_cases["display_style"]["index"].count(group_name_index) > 0:
                    matched_data["group_name_index"] = special_cases["display_style"]["min"]
                  else:
                    matched_data["group_name_index"] = group_name_index

                  matched_data["group_order_weight"] = regex_index * 0.001
                  break

                # Catch arbitrary classes (eg "bg-[#123456]")
                if (
                  group_name_index_list_index == (len(group_name_index_list) - 1)
                  and regex_index == (len(order_list[group_name_index][1]) - 1)
                  and class_name.find("[") > -1
                  and class_name.rfind("]") > -1
                ):
                  if special_cases["position_style"]["index"].count(group_name_index) > 0:
                    matched_data["group_name_index"] = special_cases["position_style"]["min"]
                  elif special_cases["display_style"]["index"].count(group_name_index) > 0:
                    matched_data["group_name_index"] = special_cases["display_style"]["min"]
                  else:
                    matched_data["group_name_index"] = group_name_index

                  matched_data["group_order_weight"] = 0.999
                  break

              if matched_data["group_name_index"] is not None:
                break

          class_name_variant_sort = None

          # find dynamic class_name (if/else) by templating engine
          if re_string_start.match(class_name) is None:  # if string doesn't start with [\w\-\!]
            class_name_variant_sort = []
            res = class_name.split(conditional_string)[1]
            res = re_template_class.findall(res)
            for index, item in enumerate(res):
              class_name_variant_sort.append(item[1:-1])

          # Sort variants
          if class_name_variant_sort is None:  # If class_name is not set dynamically
            if class_name.count(":") > 1:
              class_name = class_name.split(":")
              class_name = self.sort_variant(class_name, variant_ordering)
          else:  # If class_name is set dynamically (if/else) by templating engine
            for index, item in enumerate(class_name_variant_sort):
              if item.count(":") > 1:
                item = item.split(":")
                class_name_variant_sort[index] = self.sort_variant(item, variant_ordering)

            # replace dynamic class_name (if/else) by templating engine with sorted version
            class_name_find_replace = class_name.split(conditional_string)
            class_name_find_replace_condition = f"{class_name_find_replace[0]}{conditional_string}"
            class_name_find_replace = re_template_class.split(class_name_find_replace[1])
            class_name_variant_sort_index = 0
            for index, item in enumerate(class_name_find_replace):
              if re_template_class.match(item):
                quote_start = class_name_find_replace[index][0]
                quote_end = class_name_find_replace[index][-1]
                class_name_find_replace[index] = (
                  quote_start + class_name_variant_sort[class_name_variant_sort_index] + quote_end
                )
                class_name_variant_sort_index += 1

            class_name = f"{class_name_find_replace_condition}{''.join(class_name_find_replace)}"

          # Get breakpoint_order_weight
          if class_name_variant_sort is None:  # If class_name is not set dynamically
            if class_name.count(":") == 0:
              matched_data["breakpoint_order_weight"] = 0
            else:
              class_name_variant_sort = class_name.split(":")
              for breakpoint_index, breakpoint_item in enumerate(breakpoint_order):
                # found breakpoint
                if f"{breakpoint_item}:" in class_name:
                  matched_data["breakpoint_order_weight"] = (breakpoint_index + 1) * breakpoint_multiplier
                  break

                # found breakpoint
                if breakpoint_item == "group-*" or breakpoint_item == "peer-*":
                  if re.search(f"{breakpoint_item[:-1]}[^:]+", class_name) is not None:
                    matched_data["breakpoint_order_weight"] = (breakpoint_index + 1) * breakpoint_multiplier
                    break

                # no breakpoint found
                if breakpoint_index == (len(breakpoint_order) - 1):
                  matched_data["breakpoint_order_weight"] = 0
          else:  # If class_name is set dynamically (if/else)
            for index, item in enumerate(class_name_variant_sort):
              if class_name_variant_sort[index].count(":") == 0:
                matched_data["breakpoint_order_weight"] = 0
              else:
                for breakpoint_index, breakpoint_item in enumerate(breakpoint_order):
                  # found breakpoint
                  if f"{breakpoint_item}:" in class_name_variant_sort[index]:
                    matched_data["breakpoint_order_weight"] = (breakpoint_index + 1) * breakpoint_multiplier
                    break

                  # found breakpoint
                  if breakpoint_item == "group-*" or breakpoint_item == "peer-*":
                    if re.search(f"{breakpoint_item[:-1]}[^:]+", class_name_variant_sort[index]) is not None:
                      matched_data["breakpoint_order_weight"] = (breakpoint_index + 1) * breakpoint_multiplier
                      break

              if matched_data["breakpoint_order_weight"] is not None:
                break

              # no breakpoint found
              if index == (len(class_name_variant_sort) - 1):
                matched_data["breakpoint_order_weight"] = 0

          # pylint: disable=E1126
          # Group class_name together
          if matched_data["group_name_index"] is None:
            class_list_others = [class_name] if class_list_others is None else class_list_others + [class_name]
          else:
            class_list_grouped[int(matched_data["group_name_index"])][1].append(
              [
                matched_data["group_name_index"]
                + matched_data["group_order_weight"]
                + matched_data["breakpoint_order_weight"],
                class_name,
              ]
            )
          # pylint: enable=E1126

        # Trim empty groups and group_name
        class_list_grouped = list(map(lambda x: x[1], filter(lambda x: len(x[1]) > 0, class_list_grouped)))

        # Flatten list, and sort according to order_weight and trim order_weight
        class_list_grouped = list(chain(*class_list_grouped))
        class_list_grouped.sort(key=lambda x: x[0])

        # Separate pseudo-elements ("before:" | "after:")
        class_list_before_element = list(
          filter(lambda x: False if x[1].find("before:") == -1 else True, class_list_grouped)
        )
        class_list_after_element = list(
          filter(lambda x: False if x[1].find("after:") == -1 else True, class_list_grouped)
        )
        class_list_grouped = list(
          filter(
            lambda x: True if (x[1].find("before:") == -1) and (x[1].find("after:") == -1) else False,
            class_list_grouped,
          )
        )

        class_list_result = separator_string.join(list(map(lambda x: x[1], class_list_grouped)))

        # Reapply pseudo-elements ("before:" | "after:")
        class_list_before_element_result = separator_string.join(list(map(lambda x: x[1], class_list_before_element)))
        class_list_after_element_result = separator_string.join(list(map(lambda x: x[1], class_list_after_element)))
        if placement == "front":
          # "before:" comes before "after:"
          if len(class_list_after_element_result) != 0:
            class_list_result = f"{class_list_after_element_result}{separator_string}{class_list_result}"
          if len(class_list_before_element_result) != 0:
            class_list_result = f"{class_list_before_element_result}{separator_string}{class_list_result}"
        else:
          # "before:" comes before "after:"
          if len(class_list_before_element_result) != 0:
            class_list_result = f"{class_list_result}{separator_string}{class_list_before_element_result}"
          if len(class_list_after_element_result) != 0:
            class_list_result = f"{class_list_result}{separator_string}{class_list_after_element_result}"

        # Reapply non-TailwindCSS classes
        if class_list_others is not None:
          class_name = res = separator_string.join(class_list_others)
          if len(class_list_result) == 0:
            class_list_result = f"{separator_string}{class_name}".strip()
          elif placement == "front":
            class_list_result = f"{separator_string}{class_name}{separator_string}{class_list_result}".strip()
          else:
            class_list_result = f"{separator_string}{class_list_result}{separator_string}{class_name}".strip()

        # Get region offset if replace string has different length
        if len(class_list_result) != region_size:
          region_offset = region_offset + len(class_list_result) - region_size

        self.view.replace(edit, region, class_list_result)
    except:
      print(sys.exc_info())

  def cleanup(self, string, remove_list):
    for item in remove_list:
      if string.startswith(item):
        string = string[len(item) :]

    return string

  def sort_variant(self, class_name, order):
    def sorting_variants(x):
      try:
        y = None
        if x.startswith("group-"):
          y = f"{x[:6]}*"
        elif x.startswith("peer-"):
          y = f"{x[:5]}*"
        else:
          y = x

        return order.index(y)
      except:
        return 99999

    class_base = class_name[-1]
    class_variants = class_name[:-1]
    class_variants.sort(key=sorting_variants)
    class_variants.append(class_base)

    return ":".join(class_variants)


class TailwindcssClassSorterEventListeners(sublime_plugin.EventListener):
  @staticmethod
  def should_run_command(view):
    if not PluginUtils.get_pref(["format_on_save"], view):
      return False

    # Flat settings in .sublime-project
    pattern = re.compile(r"tailwindcss-Class-Sorter\.extensions_regex\.")
    extensions = [*view.settings().to_dict()]
    extensions = [*filter(lambda elem: pattern.match(elem), extensions)]
    if len(extensions) > 0:
      extensions = [
        *map(lambda elem: elem.split("tailwindcss-Class-Sorter.extensions_regex.")[1].split(".")[0], extensions)
      ]
      extensions = [*set(extensions)]
    # Nested settings in .sublime-project | Default settings
    else:
      extensions = PluginUtils.get_pref(["extensions_regex"], view).keys()

    extension = os.path.splitext(view.file_name())[1][1:]

    # Default to using filename if no extension
    if not extension:
      extension = os.path.basename(view.file_name())

    # Skip if extension is not listed
    return not extensions or extension in extensions

  @staticmethod
  def on_pre_save(view):
    if TailwindcssClassSorterEventListeners.should_run_command(view):
      view.run_command("sort_tailwindcss")


class PluginUtils:
  @staticmethod
  def get_pref(key_list, view=None):
    if view is not None:
      settings = view.settings()

      # Flat settings in .sublime-project
      flat_keys = ".".join(key_list)
      if settings.has(f"{PROJECT_NAME}.{flat_keys}"):
        value = settings.get(f"{PROJECT_NAME}.{flat_keys}")
        return value

      # Nested settings in .sublime-project
      if settings.has(PROJECT_NAME):
        value = settings.get(PROJECT_NAME)

        for key in key_list:
          try:
            value = value[key]
          except:
            value = None
            break

        if value is not None:
          return value

    global_settings = sublime.load_settings(SETTINGS_FILE)
    value = global_settings.get(key_list[0])

    # Load active user settings
    user_settings = sublime.active_window().active_view().settings()

    # Overwrite global config value if it's defined
    if user_settings.has(PROJECT_NAME):
      value = user_settings.get(PROJECT_NAME).get(key_list[0], value)

    return value

  @staticmethod
  def get_order(view):
    order_type = PluginUtils.get_pref(["order_type"], view)
    order_json = json.loads(sublime.load_resource(sublime.find_resources("order_list.json")[0]))
    order_list = order_json[order_type]
    edit_order_list = PluginUtils.get_pref(["edit_order"], view)

    # "action":
    #   | {
    #   |   type: "overwrite",
    #   |   group_index: Index of default/amended/appended group,
    #   | }
    #   | {
    #   |   type: "amend",
    #   |   position: "start" | "end",
    #   |   group_index: Index of default/amended/appended group,
    #   | }
    #   | {
    #   |   type: "append",
    #   |   position: "before" | "after",
    #   |   group_index: Index of default/amended/appended group,
    #   |   group_name: New group_name (see example above for group_name),
    #   | }
    # "regex_list": Regex to find and order each class within the group

    for item in edit_order_list:
      if item["action"]["type"] == "overwrite":
        order_list[item["action"]["group_index"]][1] = item["regex_list"]
      elif item["action"]["type"] == "amend":
        order_list[item["action"]["group_index"]][1] = (
          item["regex_list"] + order_list[item["action"]["group_index"]][1]
          if item["action"]["position"] == "start"
          else order_list[item["action"]["group_index"]][1] + item["regex_list"]
        )
      else:
        append_index = (
          item["action"]["group_index"] - 1
          if item["action"]["position"] == "before"
          else item["action"]["group_index"] + 1
        )
        order_list = (
          [[item["action"]["group_name"], item["regex_list"]]] + order_list
          if append_index < 0
          else order_list[0:append_index]
          + [[item["action"]["group_name"], item["regex_list"]]]
          + order_list[append_index:]
        )

    order_group_name_list = list(map(lambda x: x[0], order_list))

    return [order_list, order_group_name_list]

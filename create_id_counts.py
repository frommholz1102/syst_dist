import json

def create_id_counts_json(num_folders, num_groups):
    id_counts = {}
    for group_id in range(1, num_groups + 1):
        id_counts[group_id] = [1] * num_folders
    
    with open('id_counts.json', 'w') as file:
        json.dump(id_counts, file, indent=4)

# Example usage:
num_folders = 115
num_groups = 12
create_id_counts_json(num_folders, num_groups)